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
            speed: 1000,
            key: 'id'
        }, opts);

        function init(grid) {
            var oldItems = {};

            opts.fields = has(opts.fields) ? opts.fields : grid.getColumns().map(function (c) { return c.field; });

            function cacheData() {
                var item, i;

                for (i = 0; i < grid.getDataLength(); i += 1) {
                    item = grid.getDataItem(i);
                    if (has(item)) {
                        oldItems[item[opts.key]] = item;
                    }
                }
            }

            grid.getData().onRowsChanged.subscribe(function (e, args) {
                var rows = args.rows,
                    timestamp = new Date().getTime().toString(),
                    cssKeyChanged = 'flash_chaged_' + timestamp,
                    cssKeyChanges = 'flash_changes_' + timestamp,
                    stylesChanged = clone(has(grid.getCellCssStyles(cssKeyChanged)) || {}),
                    stylesChanges = clone(has(grid.getCellCssStyles(cssKeyChanges)) || {});

                rows.forEach(function (row) {
                    var newItem,
                        oldItem,
                        d,
                        cssChanged,
                        cssChanges;

                    newItem = grid.getDataItem(row);
                    if (!has(newItem)) { return; }

                    oldItem = oldItems[newItem[opts.key]];
                    if (!has(oldItem)) { return; }


                    if (has(oldItem) && oldItem !== newItem) {
                        d = diff(oldItem, newItem, opts.fields);
                        //console.timeEnd('diff');
                        cssChanged = {};
                        cssChanges = {};

                        Object.keys(d).forEach(function (dp) {
                            var oldValue = d[dp][0],
                                newValue = d[dp][1];
                            if (newValue > oldValue) {
                                cssChanges[dp] = 'slick-cell-changed-up';
                                cssChanged[dp] = 'slick-cell-changed';
                            }
                            if (newValue < oldValue) {
                                cssChanges[dp] = 'slick-cell-changed-down';
                                cssChanged[dp] = 'slick-cell-changed';
                            }
                        });

                        stylesChanged[row] = cssChanged;
                        stylesChanges[row] = cssChanges;
                    }
                });

                grid.setCellCssStyles(cssKeyChanged, stylesChanged);
                grid.setCellCssStyles(cssKeyChanges, stylesChanges);

                cacheData();

                setTimeout(function () {
                    grid.removeCellCssStyles(cssKeyChanges);
                }, 100);

                setTimeout(function () {
                    grid.removeCellCssStyles(cssKeyChanged);
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