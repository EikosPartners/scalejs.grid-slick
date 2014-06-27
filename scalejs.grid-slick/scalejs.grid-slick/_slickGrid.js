/*global define*/
/// <reference path="../Scripts/_references.js" />
define([
    'scalejs!core',
    'require',
    'knockout',
    'jQuery',
    'slick.grid',
    './observableDataview',
    './observableFilters',
    './changesFlasher'
], function (
    core,
    require,
    ko,
    $,
    Slick,
    observableDataView
) {


    /// <param name="ko" value="window.ko" />
    var isObservable = ko.isObservable,
        isObservableArray = function (ob) {
            return isObservable(ob) && ob.indexOf;
        },
        merge = core.object.merge,
        has = core.object.has,
        toEnumerable = core.linq.enumerable.from,
        observable = ko.observable,
        observableArray = ko.observableArray,
        computed = ko.computed,
        valueOrDefault = core.object.valueOrDefault;

    function slickGrid(element, options) {
        var dataView,
            grid,
            sortBy = ko.observable(),
            internalItemsSource,
            itemsSource = options.itemsSource,
            filterableColumns,
            operations;

        function createDataView() {
            //dataView = new Slick.Data.DataView({ inlineFilters: true });

            dataView = observableDataView(merge(options, { itemsSource: internalItemsSource }));

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
            if (options.customSort && isObservable(options.sorting)) {
                grid.onSort.subscribe(function (e, args) {
                    if (args.multiColumnSort) {
                        throw new Error('Multi column sort is not implemented');
                    }

                    var sort = {};
                    sort[args.sortCol.field] = args.sortAsc;

                    options.sorting(sort);
                });

                function newSorting(newSort) {
                    var sorts = Object.keys(newSort),
                        sort = sorts[0];

                    grid.setSortColumn(sort, newSort[sort]);
                }
                newSorting(options.sorting());
                options.sorting.subscribe(newSorting);
                options.sorting.valueHasMutated();
            } else if (isObservable(options.sorting)) {
                grid.onSort.subscribe(function (e, args) {
                    var sort = args.multiColumnSort ? args.sortCols : [args],
                        sortOpt = {};
                    sort.forEach(function (col) {
                        sortOpt[col.sortCol.field] = col.sortAsc;
                    });
                    options.sorting(sortOpt);

                    sortBy(sort);
                });
            } else if (options.sorting) {
                grid.onSort.subscribe(function (e, args) {
                    sortBy(args.multiColumnSort ?
                        args.sortCols :
                        [args]);
                });
            }
        }
        /*jslint unparam: false*/

        function lower(x) {
            if (typeof x === "string") {
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

            if (!args) {
                return items;
            }
            

            function thenBy(source, a) {
                return a.sortAsc
                    ? source.thenBy(comparer(a.sortCol.field))
                    : source.thenByDescending(comparer(a.sortCol.field));
            }

            function orderBy(source, a) {
                return a.sortAsc
                    ? source.orderBy(comparer(a.sortCol.field))
                    : source.orderByDescending(comparer(a.sortCol.field));
            }

            ordered = orderBy(toEnumerable(items), args[0]);
            ordered = toEnumerable(args)
                     .skip(1)
                     .aggregate(ordered, thenBy);
            grid.setSortColumns(args.map(function(a) { return { columnId: a.sortCol.field, sortAsc: a.sortAsc }; }));

            items = ordered.toArray();

            return items;
        }

        function createGrid() {
            var plugins,
                initial;

            options.explicitInitialization = true;
            grid = new Slick.Grid(element, dataView, options.columns, options);
            $(element).data('slickgrid', grid);

            if (isObservable(options.update)) {
                options.update.subscribe(function () {
                    grid.setColumns(options.columns);
                });
            }

            initial = options.columns.filter(function (c) {
                return c.defaultSort;
            });
            if (initial) {
                var sort = initial.map(function (col) {
                    return {
                        sortAsc: col.defaultSort === 'asc',
                        sortCol: col
                    };
                }),
                    sortOpt = {};
                if (isObservable(options.sorting)) {
                    sort.forEach(function (col) {
                        sortOpt[col.sortCol.field] = col.sortAsc;
                    });
                    options.sorting(sortOpt);

                    options.sorting.subscribe(function (sorts) {
                        sortBy(options.columns.reduce(function (cols, col) {
                            if (sorts[col.field] !== undefined) {
                                cols.push({
                                    sortAsc: sorts[col.field],
                                    sortCol: col
                                });
                            }
                            return cols;
                        }, []));
                    });
                }

                sortBy(sort);
            }

            grid.setSelectionModel(new Slick.RowSelectionModel());

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
                    grid.init();
                });
            } else {
                grid.init();
            }
        }

        function subscribeToDataView() {
            dataView.subscribe();
        }

        function subscribeToSelection() {
            if (isObservableArray(options.selectedItem)) {
                /*jslint unparam:true*/
                grid.getSelectionModel().onSelectedRangesChanged.subscribe(function (ranges) {
                    var items = [];

                    grid.getSelectedRows().forEach(function (row) {
                        items.push(grid.getDataItem(row));
                    });

                    options.selectedItem(items);
                });
                /*jslint unparam:false*/
            } else if (isObservable(options.selectedItem)) {
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
            var top;
            if (isObservable(options.viewport)) {
                grid.onViewportChanged.subscribe(function () {
                    var vp = grid.getViewport();
                    options.viewport(vp);
                });

                options.viewport.subscribe(function (vp) {
                    // stop stack overflow due to unknown issue with slickgrid
                    if (vp.top > top + 2 || vp.top < top -2) {
                        grid.scrollRowIntoView(vp.top);
                        top = vp.top;
                    }
                });
            }
        }

        function subscribeToLayout() {
            if (core.layout && core.layout.onLayoutDone) {
                core.layout.onLayoutDone(function () {
                    grid.resizeCanvas();
                    if (isObservable(options.viewport)) {
                        var vp = grid.getViewport();
                        options.viewport(vp);
                    }
                });
            }
        }

        function createFilter() {
            var evaluateFunc = {
                EqualTo: function(s, v) { return parseFloat(s) === parseFloat(v) },
                GreaterThan: function(s, v) { return parseFloat(s) > parseFloat(v) },
                LessThan: function(s, v) { return parseFloat(s) < parseFloat(v) },
                NotEqualTo: function (s, v) { return parseFloat(s) !== parseFloat(v) },
                In: function (s, v) {
                    s = valueOrDefault(s, "").toString();
                    return v.contains(s);
                },
                Contains: function (s, v) {
                    s = valueOrDefault(s, "").toString().toLowerCase();
                    v = valueOrDefault(v, "").toString().toLowerCase();
                    return s.indexOf(v) !== -1
                },
                StartsWith: function (s, v) {
                    s = valueOrDefault(s, "").toString().toLowerCase();
                    v = valueOrDefault(v, "").toString().toLowerCase();
                    return s.indexOf(v) === 0
                },
                EndsWith: function (s, v) {
                    s = valueOrDefault(s, "").toString().toLowerCase();
                    v = valueOrDefault(v, "").toString().toLowerCase();
                    return s.indexOf(v, s.length - v.length) !== -1
                },
                NotEmpty: function (s) {
                    return has(s) && s !== ""
                }
            }


            function evaluateOperation(e, v) {
                var isValid;
                evaluate = evaluateFunc[e.op];

                if (e.op === "In" || e.op === "NotEmpty") {
                    isValid = evaluate(v, e.values);
                } else {
                    for (var i = 0; i < e.values.length; i += 1) {
                        isValid = evaluate(v, valueOrDefault(e.values[i], "").toString());
                        if (!isValid) break;
                    }
                }

                return isValid;
            }

            filterableColumns.forEach(function (c) {
                var quickSearch = observable(''),
                    quickFilterOp = c.filter.quickFilterOp;
                c.filter = {
                    type: c.filter.type,
                    quickFilterOp: quickFilterOp,
                    value: observable(),
                    quickSearch: quickSearch,
                    values: observable([])
                }

                quickSearch.subscribe(function () {
                    //gets the initial list values based on current filters
                    var listValues = options.itemsSource()
                          .where(function (v) {
                              var keep = true;
                              ops = operations.filter(function (o) {
                                  return o.id !== c.id
                              });

                              for (var i = 0; i < ops.length; i++) {
                                  keep = evaluateOperation(ops[i], v[ops[i].id])
                                  if (!keep) break;
                              }
                              return keep;
                          })
                        .distinct(function (r) { if (has(r[c.id])) return r[c.id] })
                        .orderBy(comparer(c.id))
                        .select(function (r) {
                            return valueOrDefault(r[c.id], "").toString();
                        });

                    if (quickSearch().values[0]) {
                        s = quickSearch().values[0].toLowerCase();
                        listValues = listValues.where(function (v) {
                            v = v.toLowerCase();

                            if (quickFilterOp === "Contains") {
                                return v.indexOf(s) !== -1;
                            }
                            return v.indexOf(s) === 0
                        });
                    }
                    c.filter.values(listValues.take(50).toArray());
                })
            });
            itemsSource = computed(function () {
                operations = filterableColumns.selectMany(function (c) { return c.filter.value() }, function (c, v) {
                    return {
                        id: c.id,
                        op: v.op,
                        values: v.values
                    };
                }).toArray();
                if (operations.length > 0) {
                    var newItems = options.itemsSource().filter(function (v) {
                        var keep;
                        for (var i = 0; i < operations.length; i++) {
                            keep = evaluateOperation(operations[i], v[operations[i].id])
                            if (!keep) break;
                        }
                        return keep;
                    });
                    return options.sorting ? newItems : newItems.map(function (e, i) {
                        e.index = i;
                        return e;
                    });
                }
                return options.itemsSource();
            });
        }



        filterableColumns = options.columns.filter(function (c) {
            return c.filter && !isObservable(c.filter.value);
        });

        if (filterableColumns.length > 0) {
            createFilter();
        }

        if (options.sorting === true || (isObservable(options.sorting) && !options.customSort)) {
            internalItemsSource = ko.computed(function () {
                var orderedItems = sortItems(itemsSource(), sortBy());
                orderedItems.forEach(function (o, i) {
                    o.index = i;
                });
                return orderedItems;
            });
        } else {
            internalItemsSource = itemsSource;
        }

        createDataView();
        createGrid();

        subscribeToDataView();
        subscribeToSelection();
        subscribeToOnSort();
        subscribeToViewport();
        subscribeToLayout();
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
