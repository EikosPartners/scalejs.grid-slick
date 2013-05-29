/*global define*/
/// <reference path="../Scripts/_references.js" />
define([
    'require',
    //'scalejs!core',
    './observableDataview',
    'knockout',
    'slick.grid',
    './observableFilters'
    //'slick.dataview',
    //'slick.rowselectionmodel'
], function (
    require,
    //core,
    observableDataView,
    ko,
    Slick
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

            if (options.plugins) {
                plugins = Object.keys(options.plugins).map(function (p) {
                    return ['observableFilters'].indexOf(p) >= 0 ? './' + p : p;
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
