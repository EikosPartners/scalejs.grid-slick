/*global define*/
/// <reference path="../Scripts/_references.js" />
define([
    //'scalejs!core',
    'knockout',
    'slick.grid'
], function (
    //core, 
    ko,
    Slick
) {
    'use strict';

    /// <param name="ko" value="window.ko" />
    var isObservable = ko.isObservable;

    return function (opts) {
        var //has = core.object.has,
            onRowCountChanged = new Slick.Event(),
            onRowsChanged = new Slick.Event(),
            items = {};

        function getLength() {
            if (isObservable(opts.itemsCount)) {
                return opts.itemsCount();
            }

            return items.length;
        }

        function getItem(index) {
            //console.log('-->getItem:', index, items[index]);
            return items ? items[index] : null;
        }

        function getItemMetadata(index) {
            var item = items[index];
            return item ? item.metadata : null;
        }

        function sort() {
        }

        function subscribeToItemsCount() {
            var oldCount = getLength();

            if (isObservable(opts.itemsCount)) {
                opts.itemsCount.subscribe(function (newCount) {
                    onRowCountChanged.notify({previous: oldCount, current: newCount}, null, null);
                });
            } else {
                opts.itemsSource.subscribe(function (newItems) {
                    onRowCountChanged.notify({previous: oldCount, current: newItems.length}, null, null);
                });
            }
        }

        function subscribeToItemsSource() {
            if (!isObservable(opts.itemsSource)) {
                throw new Error('`itemsSource` must be an observableArray.');
            }


            opts.itemsSource.subscribe(function (newItems) {
                var rows = [],
                    i;

                items = {};

                for (i = 0; i < newItems.length; i += 1) {
                    rows[i] = newItems[i].index;
                    items[rows[i]] = newItems[i];
                }

                if (rows.length > 0) {
                    onRowsChanged.notify({rows: rows}, null, null);
                }
            });
        }

        subscribeToItemsSource();
        subscribeToItemsCount();

        return {
            // data provider interface
            getLength: getLength,
            getItem: getItem,
            getItemMetadata: getItemMetadata,
            // additional funcitonality
            sort: sort,
            // events
            onRowCountChanged: onRowCountChanged,
            onRowsChanged: onRowsChanged
        };
    };
});
