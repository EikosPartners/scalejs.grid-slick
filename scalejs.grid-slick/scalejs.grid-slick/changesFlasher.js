/*global define, console, setTimeout*/
/// <reference path="../Scripts/_references.js" />
define([
    'scalejs!core'
], function (
    core
) {
    /// <param name="ko" value="window.ko" />
    'use strict';

    /*jslint unparam: true*/
    return function changesFlasher(opts) {
        var clone = core.object.clone,
            has = core.object.has,
            diff = core.object.diff,
            merge = core.object.merge;

        opts = merge({
            speed: 800,
            key: 'id'
        }, opts);

        function init(grid) {
            var oldItems = {};

            function cacheData() {
                var item, i;

                for (i = 0; i < grid.getDataLength(); i += 1) {
                    item = grid.getDataItem(i);
                    oldItems[item[opts.key]] = item;
                }
            }

            grid.getData().onRowsChanged.subscribe(function (e, args) {
                var rows = args.rows,
                    timestamp = new Date().getTime().toString(),
                    cssKey = 'flash_changes_' + timestamp,
                    styles = clone(has(grid.getCellCssStyles(cssKey)) || {});

                rows.forEach(function (row) {
                    var newItem = grid.getDataItem(row),
                        oldItem = oldItems[newItem[opts.key]],
                        d,
                        css;

                    if (has(oldItem) && oldItem !== newItem) {
                        d = diff(oldItem, newItem);
                        css = {};
                        Object.keys(d).forEach(function (dp) {
                            var oldValue = d[dp][0],
                                newValue = d[dp][1];
                            if (newValue > oldValue) {
                                css[dp] = 'change-up';
                            }
                            if (newValue < oldValue) {
                                css[dp] = 'change-down';
                            }
                        });
                        styles[row] = css;
                    }
                });

                grid.setCellCssStyles(cssKey, styles);

                cacheData();

                setTimeout(function () {
                    grid.removeCellCssStyles(cssKey);
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