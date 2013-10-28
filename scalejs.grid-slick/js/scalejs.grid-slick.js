
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

define('text!scalejs.grid-slick/filters.html',[],function () { return '<div id="number_filter_template">\r\n    <div data-bind="css: { iconArrowLeft: !flipped(), iconArrowRight: flipped }"></div>\r\n   <div class="numberFilter">\r\n        SELECT VALUE:\r\n       <div>QUICK SEARCH: <input data-bind="value: quickSearch, valueUpdate: \'afterkeydown\'" /></div>\r\n       <div class="listFilterBox">\r\n           <div><input type="checkbox" data-bind="checked: all" />\r\n               <span>Select All</span>\r\n           </div>\r\n           <!-- ko foreach: options -->\r\n           <div><input type="checkbox" data-bind="checked: selected" />\r\n               <span data-bind="text: name.toUpperCase()"></span>\r\n           </div>\r\n           <!-- /ko -->\r\n       </div>\r\n       SHOW ROWS WITH VALUES THAT:\r\n       <div class="numberFilterBox">\r\n           <div><select data-bind="value: comparisonA">\r\n                <option value="=">IS EQUAL TO</option>\r\n                <option value="<">IS LESS THAN</option>\r\n                <option value="!=">IS NOT EQUAL TO</option>\r\n                <option value=">">IS GREATER THAN</option>                \r\n           </select></div>\r\n           <input type="text" data-bind="value: valueA, valueUpdate: \'afterkeydown\'" />\r\n           <div>AND</div>\r\n            <div><select data-bind="value: comparisonB">\r\n                <option value="=">IS EQUAL TO</option>\r\n                <option value="<">IS LESS THAN</option>\r\n                <option value="!=">IS NOT EQUAL TO</option>\r\n                <option value=">">IS GREATER THAN</option>                \r\n           </select></div>\r\n           <input type="text" data-bind="value: valueB, valueUpdate: \'afterkeydown\'" />\r\n       </div>\r\n   </div> \r\n</div>\r\n\r\n<div id="string_filter_template">\r\n    <div data-bind="css: { iconArrowLeft: !flipped(), iconArrowRight: flipped }"></div>\r\n   <div class="numberFilter">\r\n        SELECT VALUE:\r\n       <div>QUICK SEARCH: <input data-bind="value: quickSearch, valueUpdate: \'afterkeydown\'" /></div>\r\n       <div class="listFilterBox">\r\n           <div><input type="checkbox" data-bind="checked: all" />\r\n               <span>Select All</span>\r\n           </div>\r\n           <!-- ko foreach: options -->\r\n           <div><input type="checkbox" data-bind="checked: selected" />\r\n               <span data-bind="text: name.toUpperCase()"></span>\r\n           </div>\r\n           <!-- /ko -->\r\n       </div>\r\n       SHOW ROWS WITH VALUES THAT:\r\n       <div class="numberFilterBox">\r\n           <div><select data-bind="value: comparisonA">\r\n                <option value="contains">CONTAINS</option>\r\n                <option value="starts">STARTS WITH</option>\r\n                <option value="ends">ENDS WITH</option>             \r\n           </select></div>\r\n           <input type="text" data-bind="value: valueA, valueUpdate: \'afterkeydown\'" />\r\n           <div>AND</div>\r\n            <div><select data-bind="value: comparisonB">\r\n                <option value="contains">CONTAINS</option>\r\n                <option value="starts">STARTS WITH</option>\r\n                <option value="ends">ENDS WITH</option>                \r\n           </select></div>\r\n           <input type="text" data-bind="value: valueB, valueUpdate: \'afterkeydown\'" />\r\n       </div>\r\n   </div> \r\n</div>\r\n\r\n\r\n';});

/*global define, console*/
/// <reference path="../Scripts/_references.js" />
define('scalejs.grid-slick/observableFilters',[
    'scalejs!core',
    'jQuery',
    'knockout',
    'text!./filters.html',
    'bPopup',
    'scalejs.statechart-scion'
], function (
    core,
    $,
    ko,    
    filterTemplates
) {
    /// <param name="ko" value="window.ko" />
    
    var statechart = core.state.builder.statechart,
        state = core.state.builder.state,
        on = core.state.builder.on,
        onEntry = core.state.builder.onEntry,
        onExit = core.state.builder.onExit,
        goto = core.state.builder.goto,
        gotoInternally = core.state.builder.gotoInternally,
        observable = ko.observable,
        computed = ko.computed,
        observableArray = ko.observableArray,
        unwrap = ko.utils.unwrapObservable,
        registerTemplates = core.mvvm.registerTemplates;

    registerTemplates(filterTemplates);

    function option(name) {
        return {
            selected: observable(true),
            name: name.toString()
        };
    }

    function getOperation(comp) {
        var ret = "";
        switch (comp()) {
            case "=":
                ret = "EqualTo";
                break;
            case ">":
                ret = "GreaterThan";
                break;
            case "<":
                ret = "LessThan";
                break;
            case "!=":
                ret = "NotEqualTo";
                break;
            case "contains":
                ret = "Contains";
                break;
            case "starts":
                ret = "StartsWith";
                break;
            case "ends":
                ret = "EndsWith"
                break;
        }
        return ret;
    };

    function setupFilter(fieldFilter, $node, node, column) {
        var filter = fieldFilter.value,
            quickSearch = fieldFilter.quickSearch || observable(),
            comp = {
                a: observable(),
                valA: observable(),
                b: observable(),
                valB: observable()
            },
            allCheckbox = observable(true),
            listItems = fieldFilter.values || observable(['a', 'b', 'c', 'd']),
            quickFilter = observable(),
            selectableListItems = computed(function () {
                return unwrap(listItems).map(option);
            }),
            valExpression = computed(function () {
                var expression;
                if (comp.valA()) {
                    expression = [{
                        op: getOperation(comp.a),
                        values: [comp.valA()]
                    }];

                    if (comp.valB()) {
                        expression.push({
                            op: getOperation(comp.b),
                            values: [comp.valB()]
                        });
                    }
                }
                return expression;
            }),
            listExpression = computed(function () {
                var list = selectableListItems().filter(function (v) {
                    return v.selected();
                });

                if (list.length > 0 && list.length < selectableListItems().length) {
                    return [{
                        op: 'In',
                        values: list.map(function (v) { return v.name })
                    }];
                }

                if (allCheckbox() && quickSearch()) {
                    return [{
                        op: fieldFilter.quickFilterOp || 'StartsWith',
                        values: [quickSearch()]
                    }];
                }
            }),
            writeExpression = computed(function () {
                if (!quickFilter()) {
                    return undefined
                }
                return [{
                    op: fieldFilter.quickFilterOp || 'StartsWith',
                    values: [quickFilter()]
                }];
            }),
            filterOn = computed(function () {
                if (quickFilter()) {
                    return false;
                }
                return listExpression() || valExpression();
            }),
            flipped = observable(false),
            subscription = {},
            bindings,
            $filter,
            $popup,
            bindings = {
                comparisonA: comp.a,
                comparisonB: comp.b,
                valueA: comp.valA,
                valueB: comp.valB,
                quickSearch: quickSearch,
                all: allCheckbox,
                options: selectableListItems,
                popupTemplate: fieldFilter.type === "string" ? "string_filter_template" : "number_filter_template",
                value: quickFilter,
                filterOn: filterOn,
                flipped: flipped
            };


        ko.applyBindings(bindings, node);

        function sendExpression() {
            var ret = (writeExpression() || listExpression() || valExpression() || []);

            console.log(ret);
            console.log(filter());
            if (JSON.stringify(ret) !== JSON.stringify(filter())) {
                filter(ret);
            }
        }

        function checkAll() {
            selectableListItems().forEach(function (v) {
                v.selected(true);
            });
            allCheckbox(true);
        }

        function uncheckAll() {
            selectableListItems().forEach(function (v) {
                v.selected(false);
            });
            allCheckbox(false);
        }

        function subscribe(raise, e) {
            console.log('Subscribing');
            subscription.all = allCheckbox.subscribe(function (v) {
                quickFilter(undefined);
                typeof e.all === "string" ? raise(e.all) : e.all(raise, v);
            });
            subscription.list = listExpression.subscribe(function (v) {
                quickFilter(undefined);
                typeof e.list === "string" ? raise(e.list) : e.list(raise, v);
            });
            subscription.value = valExpression.subscribe(function (v) {
                quickFilter(undefined);
                typeof e.value === "string" ? raise(e.value) : e.value(raise, v);
            });
        }

        function selectedItems() {
            return selectableListItems().filter(function (v) {
                return v.selected();
            });
        }

        function sendListExpression(raise) {
            if (selectedItems().length === 0 || listExpression()) {
                sendExpression();
            } else {
                raise('filter.empty');
            }
        }

        function unsubscribe() {
            console.log('unsubscribing.');
            subscription.all.dispose();
            subscription.list.dispose();
            subscription.value.dispose();
        }

        function clearValue() {
            comp.valA(undefined);
            comp.valB(undefined);
        }

        function createStatechart() {
            return statechart(
            state('filter',
                onEntry(function () {
                    filter([]);
                    var statechart = this;
                    $filter = $($node.find('.slick-filter')[0]);
                    $filter.click(function () {
                        if (!$popup) {
                            $popup = $('<div class="slick-filter-popup" data-bind="template: { name: popupTemplate, data: $data}"></div>').appendTo('body');
                            ko.applyBindings(bindings, $popup.get()[0]);
                        }

                        function flipFilter(flip) {
                            flipped(flip);
                            if (flip) {
                                return $filter.offset().left - $popup.width() - column.width + 10;
                            }
                            return $filter.offset().left + 20;
                        }


                        var offsetX = flipFilter($filter.offset().left + 10 + $popup.width() > window.innerWidth),
                            offsetY = $filter.offset().top + $popup.height() > window.innerHeight ? window.innerHeight - $popup.height() : $filter.offset().top - 10;

                        statechart.send('filter.open');
                        $popup.bPopup({
                            follow: [false, false],
                            position: [offsetX, offsetY],
                            opacity: 0,
                            speed: 0,
                            onClose: function () {
                                statechart.send('filter.close');
                            }
                        });
                        var arrow = $popup.find('div')[0];
                        $(arrow).css("top", $filter.offset().top - offsetY);
                    });
                }),
                on('filter.open', gotoInternally('filter.shown')),
                on('filter.close', gotoInternally('filter.hidden')),
                state('filter.hidden', //parses quickFilter and sends expressions immediately         
                    onEntry(function () {
                        this.quickFilterSub = quickFilter.subscribe(function (value) {
                            sendExpression();
                        });
                    }),
                    onExit(function () {
                        this.quickFilterSub.dispose();
                    })),
                state('filter.shown',
                    onEntry(function () {
                        quickSearch("");
                        if (quickFilter()) {
                            this.send('filter.empty');
                        } else if (listExpression()) {
                            this.send('filter.list');
                        } else if (valExpression()) {
                            this.send('filter.value');
                        } else {
                            this.send('filter.none');
                        }
                    }),
                    on('filter.empty', gotoInternally('filter.all.selected')),
                    on('filter.list', gotoInternally('filter.all.deselected.list')),
                    on('filter.value', gotoInternally('filter.all.deselected.value')),
                    on('filter.none', gotoInternally('filter.all.deselected.none')),
                    state('filter.all.waiting'),
                    state('filter.all.selected',
                        onEntry(function (e) {
                            checkAll();
                            clearValue();
                            sendExpression();
                            subscribe(this.send, {
                                all: 'filter.none',
                                list: function (raise, v) {
                                    //so that when a filter is entered, we only redirect to the 
                                    //deselected.list state if there is actually a list value selected.
                                    if (v) {
                                        raise('filter.list');
                                    }
                                },
                                value: 'filter.value'
                            });
                        }),
                        onExit(function () {
                            unsubscribe();
                        })),
                    state('filter.all.deselected',
                        state('filter.all.deselected.none',
                            onEntry(function (e) {
                                uncheckAll();
                                clearValue();
                                sendExpression();
                                subscribe(this.send, {
                                    all: 'filter.empty',
                                    list: 'filter.list',
                                    value: 'filter.value'
                                });
                            }),
                            onExit(function () {
                                unsubscribe();
                            })),
                       state('filter.all.deselected.list',
                           onEntry(function (e) {
                               allCheckbox(false);
                               clearValue();
                               sendExpression();
                               subscribe(this.send, {
                                   all: 'filter.empty',
                                   list: sendListExpression,
                                   value: 'filter.value'
                               });
                           }),
                            onExit(function () {
                                unsubscribe();
                            })),
                        state('filter.all.deselected.value',
                            onEntry(function (e) {
                                uncheckAll();
                                sendExpression();
                                subscribe(this.send, {
                                    all: 'filter.empty',
                                    list: 'filter.list',
                                    value: sendExpression
                                });
                            }),
                            onExit(function () {
                                unsubscribe();
                            }))))));
        }

        filterStatechart = createStatechart();

        filterStatechart.start();
    }

    /*jslint unparam: true*/
    return function observableFilters(opts) {
        function init(grid) {
            grid.onHeaderRowCellRendered.subscribe(function (e, args) {
                var $node = $(args.node),
                    node = $node[0],
                    fieldFilter = args.column.filter,
                    filterHtml = '<input type="text" data-bind="value: value, valueUpdate: \'afterkeydown\'"/><div class="slick-filter" data-bind="css: { iconFilterOff: !filterOn(), iconFilterOn: filterOn }"></div>',
                    $filter,
                    bindings,
                    $popup;


                if (fieldFilter) {
                    $node.html(filterHtml);
                    setupFilter(fieldFilter, $node, node, args.column);
                }
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

