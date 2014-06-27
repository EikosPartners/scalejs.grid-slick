/*global define*/
/// <reference path="../Scripts/_references.js" />
define([
    'scalejs!core',
    'knockout',
    'slick.grid'
], function (
    core, 
    ko,
    Slick
) {
    /// <param name="ko" value="window.ko" />
    "use strict";


    var isObservable = ko.isObservable,
        computed = ko.computed,
        has = core.object.has;

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

        function getItems() {
            return items;
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
                    onRowCountChanged.notify({ previous: oldCount, current: newCount }, null, null);
                    oldCount = newCount;
                });
            } else {
                computed({
                    read: function () {
                        var newItems = opts.itemsSource() || [],
                            newCount = newItems.length;

                        if (newCount !== oldCount) {
                            onRowCountChanged.notify({ previous: oldCount, current: newCount }, null, null);
                            oldCount = newCount;
                        }
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

                    newItems = newItems.filter(function (item) { return has(item); });
                    oldIndexes = Object.keys(items).map(function (key) { return parseInt(key, 10); });
                    newIndexes = newItems.map(function (newItem) { return newItem.index; });

                    deletedIndexes = oldIndexes.except(newIndexes).toArray();
                    deletedIndexes.forEach(function (index) { delete items[index]; });

                    rows = newItems
                        .filter(function (newItem) {
                            return items[newItem.index] !== newItem;
                        })
                        .map(function (newItem) {
                            //var oldItem
                            items[newItem.index] = newItem;
                            return newItem.index;
                        });

                    if (rows.length > 0) {
                        onRowsChanged.notify({ rows: rows }, null, null);
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
            getItems: getItems,
            // additional funcitonality
            subscribe: subscribe,
            // events
            onRowCountChanged: onRowCountChanged,
            onRowsChanged: onRowsChanged
        };
    };
});
