/*global define*/
/// <reference path="../Scripts/_references.js" />
define([
    'scalejs!core',
    'knockout',
    'slick.grid',
    'slick.dataview',
    'slick.rowselectionmodel',
    'scalejs.linq-linqjs'
], function (
    core,
    ko,
    Slick
) {
    /// <param name="ko" value="window.ko" />
    'use strict';

    var computed = ko.computed,
        unwrap = ko.utils.unwrapObservable,
        toEnumerable = core.linq.enumerable.from;

    function slickGrid(element, options) {
        var dataView,
            grid;

        function createDataView() {
            dataView = new Slick.Data.DataView({ inlineFilters: true });

            /*jslint unparam: true*/
            dataView.onRowCountChanged.subscribe(function (e, args) {
                grid.updateRowCount();
                grid.render();
            });
            /*jslint unparam: false*/

            /*jslint unparam: true*/
            dataView.onRowsChanged.subscribe(function (e, args) {
                grid.invalidateRows(args.rows);
                grid.render();
            });
            /*jslint unparam: false*/
        }

        function resetItems(newItems) {
            dataView.beginUpdate();
            dataView.setItems(newItems);
            dataView.endUpdate();
        }

        /*jslint unparam: true*/
        function subscribeToOnSort() {
            grid.onSort.subscribe(function (e, args) {
                var ordered,
                    items = dataView.getItems();

                function orderBy(source, col) {
                    return col.sortAsc
                        ? source.orderBy('$.' + col.sortCol.field)
                        : source.orderByDescending('$.' + col.sortCol.field);
                }

                function thenBy(source, col) {
                    return col.sortAsc
                        ? source.thenBy('$.' + col.sortCol.field)
                        : source.thenByDescending('$.' + col.sortCol.field);
                }

                if (args.sortCols.length === 0) { return; }

                ordered = orderBy(toEnumerable(items), args.sortCols[0]);
                ordered = toEnumerable(args.sortCols)
                    .skip(1)
                    .aggregate(ordered, thenBy);

                items = ordered.toArray();
                resetItems(items);
            });
        }
        /*jslint unparam: false*/

        function subscribeToItemsObservable() {
            computed({
                read: function () {
                    var items = unwrap(options.itemsSource);
                    resetItems(items);
                },
                disposeWhenNodeIsRemoved: element
            });
        }

        function createGrid() {
            grid = new Slick.Grid(element, dataView, options.columns, options);

            grid.setSelectionModel(new Slick.RowSelectionModel());
        }

        createDataView();
        createGrid();
        subscribeToItemsObservable();
        subscribeToOnSort();
    }

    /*jslint unparam:true*/
    function update(
        element,
        valueAccessor,
        allBindingsAccessor
    ) {
        var b = allBindingsAccessor(),
            options = b.slickGrid;

        slickGrid(element, options);
    }
    /*jslint unparam:false*/

    return {
        update: update
    };
});
