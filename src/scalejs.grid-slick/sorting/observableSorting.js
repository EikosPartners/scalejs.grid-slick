/*global define, console*/
/// <reference path="../Scripts/_references.js" />
define([
    'scalejs!core',
    'knockout'
], function (
    core,
    ko
) {
    'use strict';

    /// <param name="ko" value="window.ko" />
    return function observableSorting(sorting) {
        function init(grid) {

            // on grid sort, update sorting fields in the columns
            grid.onSort.subscribe(function (e, args) {
                var sort = args.multiColumnSort ? args.sortCols : [args];

                sort = sort.reduce(function (sortObj, arg) {
                    sortObj[arg.sortCol.id] = arg.sortAsc;
                    return sortObj;
                }, {});

                sorting(sort);
            });

            // when sorting changes, set the sort columns on the grid
            ko.computed(function () {
                if (sorting() === undefined) { return; }
                var sortCols = Object.keys(sorting()).map(function (id) {
                    return {
                        columnId: id,
                        sortAsc: sorting()[id]
                    }
                });
                grid.setSortColumns(sortCols);
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