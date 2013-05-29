/*global define, console*/
/// <reference path="../Scripts/_references.js" />
define([
    'jQuery',
    'knockout'
], function (
    $,
    ko
) {
    /// <param name="ko" value="window.ko" />
    'use strict';

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