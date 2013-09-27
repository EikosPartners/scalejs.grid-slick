
/*global define*/
/// <reference path="../Scripts/_references.js" />
define('scalejs.grid-slick/observableDataview',[
    //'scalejs!core',
    'knockout',
    'slick.grid'
], function (
    //core, 
    ko,
    Slick
) {
    /// <param name="ko" value="window.ko" />

    

    var isObservable = ko.isObservable,
        computed = ko.computed;

    return function (opts) {
        var onRowCountChanged = new Slick.Event(),
            onRowsChanged = new Slick.Event(),
            items = {};

        function getLength() {
            if (isObservable(opts.itemsCount)) {
                return opts.itemsCount();
            }

            return opts.itemsSource().length;
        }

        function getItem(index) {
            return items ? items[index] : null;
        }

        function getItemMetadata(index) {
            var item = items[index];
            return item ? item.metadata : null;
        }

        function subscribeToItemsCount() {
            var oldCount = 0;

            if (isObservable(opts.itemsCount)) {
                opts.itemsCount.subscribe(function (newCount) {
                    onRowCountChanged.notify({previous: oldCount, current: newCount}, null, null);
                    oldCount = newCount;
                });
            } else {
                computed({
                    read: function () {
                        var newItems = opts.itemsSource() || [],
                            newCount = newItems.length;

                        onRowCountChanged.notify({previous: oldCount, current: newCount}, null, null);
                        oldCount = newCount;
                    }
                });
            }
        }

        function subscribeToItemsSource() {
            computed({
                read: function () {
                    var newItems = opts.itemsSource() || [],
                        rows = [],
                        oldIndexes,
                        newIndexes,
                        deletedIndexes;

                    oldIndexes = Object.keys(items).map(function (key) { return parseInt(key, 10); });
                    newIndexes = newItems.map(function (newItem) { return newItem.index; });

                    deletedIndexes = oldIndexes.except(newIndexes).toArray();
                    deletedIndexes.forEach(function (index) { delete items[index]; });

                    rows = newItems
                        .filter(function (newItem) { return items[newItem.index] !== newItem; })
                        .map(function (newItem) {
                            //var oldItem
                            items[newItem.index] = newItem;
                            return newItem.index;
                        });

                    if (rows.length > 0) {
                        onRowsChanged.notify({rows: rows}, null, null);
                    }
                }
            });
        }

        function subscribe() {
            subscribeToItemsSource();
            subscribeToItemsCount();
        }

        if (!isObservable(opts.itemsSource)) {
            throw new Error('`itemsSource` must be an observableArray.');
        }

        return {
            // data provider interface
            getLength: getLength,
            getItem: getItem,
            getItemMetadata: getItemMetadata,
            // additional funcitonality
            subscribe: subscribe,
            // events
            onRowCountChanged: onRowCountChanged,
            onRowsChanged: onRowsChanged
        };
    };
});

/*global define, console*/
/// <reference path="../Scripts/_references.js" />
define('scalejs.grid-slick/observableFilters',[
    'jQuery',
    'knockout'
], function (
    $,
    ko
) {
    /// <param name="ko" value="window.ko" />
    

    /*jslint unparam: true*/
    return function observableFilters(opts) {
        function init(grid) {
            grid.onHeaderRowCellRendered.subscribe(function (e, args) {
                var $node = $(args.node),
                    node = $node[0],
                    fieldFilter = args.column.filter;

                if (fieldFilter) {
                    $node.html('<input type="text" data-bind="value: value, valueUpdate: \'afterkeydown\'"/>');
                    ko.applyBindings(fieldFilter, node);
                }
                /*$(args.node).empty();
                $("<input type='text'>")
                    .data("columnId", args.column.id)
                    .val(columnFilters[args.column.id])
                    .appendTo(args.node);*/
            });
        }

        function destroy() {

        }

        return {
            init: init,
            destroy: destroy
        };
    };
});
/*global define, console, setTimeout*/
/// <reference path="../Scripts/_references.js" />
define('scalejs.grid-slick/changesFlasher',[
    'scalejs!core'
], function (
    core
) {
    /// <param name="ko" value="window.ko" />
    

    /*jslint unparam: true*/
    return function changesFlasher(opts) {
        var clone = core.object.clone,
            has = core.object.has,
            diff = core.object.diff,
            merge = core.object.merge;

        opts = merge({
            speed: 1000,
            key: 'id'
        }, opts);

        function init(grid) {
            var oldItems = {};

            opts.fields = has(opts.fields) ? opts.fields : grid.getColumns().map(function (c) { return c.field; });

            function cacheData() {
                var item, i;

                for (i = 0; i < grid.getDataLength(); i += 1) {
                    item = grid.getDataItem(i);
                    if (has(item)) {
                        oldItems[item[opts.key]] = item;
                    }
                }
            }

            grid.getData().onRowsChanged.subscribe(function (e, args) {
                var rows = args.rows,
                    timestamp = new Date().getTime().toString(),
                    cssKeyChanged = 'flash_chaged_' + timestamp,
                    cssKeyChanges = 'flash_changes_' + timestamp,
                    stylesChanged = clone(has(grid.getCellCssStyles(cssKeyChanged)) || {}),
                    stylesChanges = clone(has(grid.getCellCssStyles(cssKeyChanges)) || {});

                rows.forEach(function (row) {
                    var newItem,
                        oldItem,
                        d,
                        cssChanged,
                        cssChanges;

                    newItem = grid.getDataItem(row);
                    if (!has(newItem)) { return; }

                    oldItem = oldItems[newItem[opts.key]];
                    if (!has(oldItem)) { return; }


                    if (has(oldItem) && oldItem !== newItem) {
                        d = diff(oldItem, newItem, opts.fields);
                        //console.timeEnd('diff');
                        cssChanged = {};
                        cssChanges = {};

                        Object.keys(d).forEach(function (dp) {
                            var oldValue = d[dp][0],
                                newValue = d[dp][1];
                            if (newValue > oldValue) {
                                cssChanges[dp] = 'slick-cell-changed-up';
                                cssChanged[dp] = 'slick-cell-changed';
                            }
                            if (newValue < oldValue) {
                                cssChanges[dp] = 'slick-cell-changed-down';
                                cssChanged[dp] = 'slick-cell-changed';
                            }
                        });

                        stylesChanged[row] = cssChanged;
                        stylesChanges[row] = cssChanges;
                    }
                });

                grid.setCellCssStyles(cssKeyChanged, stylesChanged);
                grid.setCellCssStyles(cssKeyChanges, stylesChanges);

                cacheData();

                setTimeout(function () {
                    grid.removeCellCssStyles(cssKeyChanges);
                }, 100);

                setTimeout(function () {
                    grid.removeCellCssStyles(cssKeyChanged);
                }, opts.speed);
            });
        }

        function destroy() {

        }

        return {
            init: init,
            destroy: destroy
        };
    };
});
/*global define*/
/// <reference path="../Scripts/_references.js" />
define('scalejs.grid-slick/slickGrid',[
    'scalejs!core',
    'require',
    'knockout',
    'jQuery',
    'slick.grid',
    './observableDataview',
    './observableFilters',
    './changesFlasher'
], function (
    core,
    require,
    ko,
    $,
    Slick,
    observableDataView
) {
    

    /// <param name="ko" value="window.ko" />
    var isObservable = ko.isObservable;

    function slickGrid(element, options) {
        var dataView,
            grid;

        function createDataView() {
            //dataView = new Slick.Data.DataView({ inlineFilters: true });
            dataView = observableDataView(options);

            /*jslint unparam: true*/
            dataView.onRowCountChanged.subscribe(function (e, args) {
                grid.updateRowCount();
                grid.render();
            });
            /*jslint unparam: false*/

            /*jslint unparam: true*/
            dataView.onRowsChanged.subscribe(function (e, args) {
                var range, invalidated;

                range = grid.getRenderedRange();

                invalidated = args.rows.filter(function (r, i) {
                    return r >= range.top && r <= range.bottom;
                });

                if (invalidated.length > 0) {
                    grid.invalidateRows(invalidated);
                    grid.render();
                }
            });
            /*jslint unparam: false*/
        }


        /*jslint unparam: true*/
        function subscribeToOnSort() {
            if (isObservable(options.sorting)) {
                grid.onSort.subscribe(function (e, args) {
                    if (args.multiColumnSort) {
                        throw new Error('Multi column sort is not implemented');
                    }

                    var sort = {};
                    sort[args.sortCol.field] = args.sortAsc;

                    options.sorting(sort);
                });

                options.sorting.subscribe(function (newSort) {
                    var sorts = Object.keys(newSort),
                        sort = sorts[0];

                    grid.setSortColumn(sort, newSort[sort]);
                });
            }
        }
        /*jslint unparam: false*/

        function createGrid() {
            var plugins;

            options.explicitInitialization = true;
            grid = new Slick.Grid(element, dataView, options.columns, options);
            $(element).data('slickgrid', grid);

            grid.setSelectionModel(new Slick.RowSelectionModel());

            if (options.plugins) {
                plugins = Object.keys(options.plugins).map(function (p) {
                    // if one of the included plugins then prefix with ./ 
                    return [
                        'observableFilters',
                        'changesFlasher'
                    ].indexOf(p) >= 0 ? './' + p : p;
                });

                require(plugins, function () {
                    var i,
                        plugin,
                        createPlugin;
                    for (i = 0; i < arguments.length; i += 1) {
                        createPlugin = arguments[i];
                        plugin = createPlugin(options.plugins[createPlugin.name]);

                        grid.registerPlugin(plugin);
                    }
                    grid.init();
                });
            } else {
                grid.init();
            }

            grid.setSelectionModel(new Slick.RowSelectionModel());
            grid.init();
        }

        function subscribeToDataView() {
            dataView.subscribe();
        }

        function subscribeToSelection() {
            if (isObservable(options.selectedItem)) {
                /*jslint unparam:true*/
                grid.getSelectionModel().onSelectedRangesChanged.subscribe(function (ranges) {
                    var rows, item;

                    rows = grid.getSelectedRows();
                    item = grid.getDataItem(rows[0]);

                    options.selectedItem(item);
                });
                /*jslint unparam:false*/
            }
        }

        function subscribeToViewport() {
            if (isObservable(options.viewport)) {
                grid.onViewportChanged.subscribe(function () {
                    var vp = grid.getViewport();
                    options.viewport(vp);
                });

                options.viewport.subscribe(function (vp) {
                    grid.scrollRowIntoView(vp.top);
                });
            }
        }

        function subscribeToLayout() {
            if (core.layout.onLayoutDone) {
                core.layout.onLayoutDone(function () {
                    grid.resizeCanvas();
                    if (isObservable(options.viewport)) {
                        var vp = grid.getViewport();
                        options.viewport(vp);
                    }
                });
            }
        }

        createDataView();
        createGrid();

        subscribeToDataView();
        subscribeToSelection();
        subscribeToOnSort();
        subscribeToViewport();
        subscribeToLayout();
    }

    /*jslint unparam:true*/
    function init(
        element,
        valueAccessor,
        allBindingsAccessor
    ) {
        var b = allBindingsAccessor(),
            options = b.slickGrid;

        slickGrid(element, options);

        return { controlsDescendantBindings: true };
    }
    /*jslint unparam:false*/

    return {
        init: init
    };
});

/*global define*/
define('scalejs.grid-slick',[
    './scalejs.grid-slick/slickGrid',
    'knockout',
    'scalejs.linq-linqjs'
], function (
    slickGrid,
    ko
) {
    

    ko.bindingHandlers.slickGrid = slickGrid;
});

