/*global define*/
/// <reference path="../Scripts/_references.js" />
define([
    'scalejs!core',
    'require',
    'knockout',
    'jQuery',
    'slick.grid',
    './observableDataview',
    './filters/observableFilters',
    './filters/defaultFilters',
    './sorting/observableSorting',
    './sorting/defaultSorting',
    './changesFlasher'
], function (
    core,
    require,
    ko,
    $,
    Slick,
    observableDataView,
    observableFilters,
    defaultFilters,
    observableSorting,
    defaultSorting,
    changesFlasher
) {


    /// <param name="ko" value="window.ko" />
/// <reference path="_slickgrid.js" />
    var isObservable = ko.isObservable,
        isObservableArray = function (ob) {
            return isObservable(ob) && ob.indexOf;
        },
        merge = core.object.merge,
        has = core.object.has,
        toEnumerable = core.linq.enumerable.from,
        observable = ko.observable,
        observableArray = ko.observableArray,
        computed = ko.computed,
        valueOrDefault = core.object.valueOrDefault;

    function slickGrid(element, options) {
        var columns = ko.unwrap(options.columns),
            internalItemsSource,
            dataView,
            grid,
            plugins = [];


        function setupFilters(itemsSource) {
            var filterableColumns = columns.filter(function (c) { return c.filter; }),
                filteredItemsSource;

            // if there are no filterable columns, no need to set up filters
            if (filterableColumns.length === 0) return itemsSource;

            // if any filter doesnt have a value, we need to make it
            if (filterableColumns.some(function (c) { return !c.filter.value })) {
                filteredItemsSource = defaultFilters(filterableColumns, itemsSource);
            } else {
                filteredItemsSource = itemsSource;
            }

            // add the filters to the plugins to be initialized later
            plugins.push(observableFilters());

            return filteredItemsSource;
        }

        function setupSorting(itemsSource) {
            var sorting = options.sorting,
                sortableColumns = columns.filter(function (c) { return c.sortable; }),
                sortedItemsSource

            // if sorting is undefined, we dont need to set up sorting
            if (sorting === undefined) return itemsSource;

            // if custom sort is enabled, we don't need to make our own sortedItemsSource
            if (options.customSort) {
                sortedItemsSource = itemsSource;
            } else {
                sorting = isObservable(options.sorting) ? options.sorting : observable();
                sortedItemsSource = defaultSorting(sorting, sortableColumns, itemsSource);
            }

            // add the sorting to the plugins to be initialized later
            plugins.push(observableSorting(sorting));

            return sortedItemsSource;
        }

        function setupIndex(itemsSource) {
            var indexedItemsSource;
            
            // if virtual scrolling is not enabled, set the items' index
            if (!options.itemsCount) {
                indexedItemsSource = ko.computed(function () {
                    return itemsSource().map(function (item, index) {
                        item.index = index;
                        return item;
                    });
                });
            } else {
                indexedItemsSource = itemsSource;
            }

            return indexedItemsSource;
        }

        // when default filtering/sorting/vitualization is enabled, we need to create our own items source
        function createInternalItemsSource() {
            internalItemsSource = options.itemsSource;
            internalItemsSource = setupSorting(internalItemsSource);
            internalItemsSource = setupFilters(internalItemsSource);
            internalItemsSource = setupIndex(internalItemsSource);
        }

        function createDataView() {
            //dataView = new Slick.Data.DataView({ inlineFilters: true });

            dataView = observableDataView(merge(options, { itemsSource: internalItemsSource }));

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

        function createGrid() {
            options.explicitInitialization = true;
            grid = new Slick.Grid(element, dataView, columns, options);
            $(element).data('slickgrid', grid);

            grid.setSelectionModel(new Slick.RowSelectionModel());

            plugins.forEach(function (p) { p.init(grid); });

            if (isObservable(options.columns)) { 
                    options.columns.subscribe(function () { 
                    columns = ko.unwrap(options.columns); 
                    grid.setColumns(columns); 
                }); 
            } 

            if (options.changesFlasher) {
                changesFlasher(grid, options.changesFlasher)
            }

            grid.init();
        }
       
        function subscribeToDataView() {
            dataView.subscribe();
        }

        function subscribeToSelection() {
            if (isObservableArray(options.selectedItem)) {
                /*jslint unparam:true*/
                grid.getSelectionModel().onSelectedRangesChanged.subscribe(function (ranges) {
                    var items = [];

                    grid.getSelectedRows().forEach(function (row) {
                        items.push(grid.getDataItem(row));
                    });

                    options.selectedItem(items);
                });
                /*jslint unparam:false*/
            } else if (isObservable(options.selectedItem)) {
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
            var top;
            if (isObservable(options.viewport)) {
                grid.onViewportChanged.subscribe(function () {
                    var vp = grid.getViewport();
                    options.viewport(vp);
                });

                options.viewport.subscribe(function (vp) {
                    // stop stack overflow due to unknown issue with slickgrid
                    if (vp.top > top + 2 || vp.top < top -2) {
                        grid.scrollRowIntoView(vp.top);
                        top = vp.top;
                    }
                });
            }
        }

        function subscribeToLayout() {
            if (core.layout && core.layout.onLayoutDone) {
                core.layout.onLayoutDone(function () {
                    grid.resizeCanvas();
                    if (isObservable(options.viewport)) {
                        var vp = grid.getViewport();
                        options.viewport(vp);
                    }
                });
            }
        }

        createInternalItemsSource();
        createDataView();
        createGrid();

        subscribeToDataView();
        subscribeToSelection();
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
