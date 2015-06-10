/*global define*/
/// <reference path="../Scripts/_references.js" />
define([
    'scalejs!core',
    'knockout'
], function (
    core,
    ko
) {
    'use strict';

    var has = core.object.has,
        computed = ko.computed;

    return function (sorting, sortableColumns, itemsSource) {
        var sortedItemsSource,
            defaultSort,
            sortBy;

        function lower(x) {
            if (typeof x === 'string') {
                return x.toLowerCase();
            }
            return x;
        }

        function comparer(on) {
            return function (x) {
                return has(x, on) ? lower(x[on]) : -Number.MAX_VALUE;
            };
        }

        function sortItems(items, args) {
            var ordered;

            if (!args || args.length === 0) {
                return items;
            }


            function thenBy(source, a) {
                return a.sortAsc
                    ? source.thenBy(comparer(a.column))
                    : source.thenByDescending(comparer(a.column));
            }

            function orderBy(source, a) {
                return a.sortAsc
                    ? source.orderBy(comparer(a.column))
                    : source.orderByDescending(comparer(a.column));
            }

            ordered = orderBy(items, args[0]);
            ordered = args
                     .skip(1)
                     .aggregate(ordered, thenBy);

            items = ordered.toArray();

            return items;
        }

        sortedItemsSource = ko.computed(function () {
            if (sorting() === undefined) { return itemsSource(); }
            var sortCols = Object.keys(sorting()).map(function (id) {
                return {
                    column: id,
                    sortAsc: sorting()[id]
                }
            });
            var orderedItems = sortItems(itemsSource(), sortCols);
            return orderedItems;
        });

        return sortedItemsSource;
    };
});
