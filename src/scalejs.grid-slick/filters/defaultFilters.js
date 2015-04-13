/*global define*/
/// <reference path="../Scripts/_references.js" />
define([
    'scalejs!core',
    'knockout'
], function (
    core,
    ko
) {

    var observable = ko.observable,
        computed = ko.computed,
        has = core.object.has,
        valueOrDefault = core.object.valueOrDefault;

    return function (filterableColumns, itemsSource) {
        var filteredItemsSource,
            evaluateFunc = {
                EqualTo: function (s, v) { return parseFloat(s) === parseFloat(v) },
                GreaterThan: function (s, v) { return parseFloat(s) > parseFloat(v) },
                LessThan: function (s, v) { return parseFloat(s) < parseFloat(v) },
                NotEqualTo: function (s, v) { return parseFloat(s) !== parseFloat(v) },
                In: function (s, v) { return v.some(function (x) { return s.match(new RegExp('^' + x + '$', 'i')); }); },
                Contains: function (s, v) { return s.match(new RegExp(v, 'i')); },
                StartsWith: function (s, v) { return s.match(new RegExp('^' + v, 'i')); },
                EndsWith: function (s, v) { return s.match(new RegExp(v + '$', 'i')); },
                NotEmpty: function (s) { return s !== "" }
            };


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
                var listValues = itemsSource()
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
        filteredItemsSource = computed(function () {
            operations = filterableColumns.selectMany(function (c) { return c.filter.value() }, function (c, v) {
                return {
                    id: c.id,
                    op: v.op,
                    values: v.values
                };
            }).toArray();
            if (operations.length > 0) {
                var newItems = itemsSource().filter(function (v) {
                    var keep;
                    for (var i = 0; i < operations.length; i++) {
                        keep = evaluateOperation(operations[i], v[operations[i].id])
                        if (!keep) break;
                    }
                    return keep;
                });
                return newItems;
            }
            return itemsSource();
        });

        return filteredItemsSource;
    }
});
