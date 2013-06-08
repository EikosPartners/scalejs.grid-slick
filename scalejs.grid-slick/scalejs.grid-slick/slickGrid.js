/*global define*/
/// <reference path="../Scripts/_references.js" />
define([
    'require',
    'knockout',
    'jQuery',
    'slick.grid',
    //'scalejs!core',
    './observableDataview',
    './observableFilters',
    './changesFlasher'
], function (
    require,
    ko,
    $,
    Slick,
    //core,
    observableDataView
) {
    'use strict';

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
                });
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

        createDataView();
        createGrid();

        subscribeToDataView();
        subscribeToSelection();
        subscribeToOnSort();
        subscribeToViewport();
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
