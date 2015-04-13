/*global define, console*/
/// <reference path="../Scripts/_references.js" />
define([
    'scalejs!core',
    'jQuery',
    'knockout',
    'text!./filters.html',
    'bPopup',
    'scalejs.statechart-scion',
    'scalejs.mvvm'
], function (
    core,
    $,
    ko,
    filterTemplates
) {
    'use strict';
    /// <param name="ko" value="window.ko" />

    var statechart = core.state.builder.statechart,
          state = core.state.builder.state,
          parallel = core.state.builder.parallel,
          on = core.state.builder.on,
          whenIn = core.state.builder.whenInStates,
          onEntry = core.state.builder.onEntry,
          onExit = core.state.builder.onExit,
          goto = core.state.builder.goto,
          gotoInternally = core.state.builder.gotoInternally,
          observable = ko.observable,
          computed = ko.computed,
          observableArray = ko.observableArray,
          unwrap = ko.utils.unwrapObservable,
          registerTemplates = core.mvvm.registerTemplates,
          has = core.object.has;

    registerTemplates(filterTemplates);

    function setupFilter(fieldFilter, column) {
        var filter = observable([]),
            quickSearch = observable(), //fieldFilter.quickSearch || observable(),
            quickOp = fieldFilter.quickFilterOp || "StartsWith",
            comp = {
                a: observable(),
                valA: observable(),
                b: observable(),
                valB: observable()
            },
            notEmpty = observable(false),
            allCheckbox = observable(true),
            loading = observable(false),
            listItems = fieldFilter.values,
            quickFilter = observable(""),
            selectableListItems = observableArray([]),
            valExpression,
            listExpression,
            quickExpression,
            filterOn,
            flipped = observable(false),
            subscription = {},
            bindings,
            $filter,
            $popup,
            send;

        // Update from fieldFilter.quickSearch:
        function updateQuickSearch(value) {
            // Unsubscribe from quickSearch to avoid calling updateQuickSearch:
            subscription.quickSearch.dispose();

            // Update quickFilter and quickSearch:
            if (!value || !value.values || !value.values.length) {
                quickFilter("");
                quickSearch("");
            } else {
                quickFilter(value.values[0]);
                quickSearch(value.values[0]);
            }

            // Subscribe updateFieldQuickSearch to external observable again:
            subscription.quickSearch = quickSearch.subscribe(updateFieldQuickSearch);
        }
        subscription.fieldQuickSearch = fieldFilter.quickSearch.subscribe(updateQuickSearch);
        //send QuickSearch expression whenever quickSearch is changed.
        function updateFieldQuickSearch(value) {
            // Unsubscribe from fieldQuickSearch to avoid calling updateFieldQuickSearch:
            subscription.fieldQuickSearch.dispose();

            // Update external observable:
            fieldFilter.quickSearch(has(value)
                ? { op: quickOp, values: [value] }
                : undefined
            );

            // Subscribe updateFieldQuickSearch to external observable again:
            subscription.fieldQuickSearch = fieldFilter.quickSearch.subscribe(updateQuickSearch);
        }
        subscription.quickSearch = quickSearch.subscribe(updateFieldQuickSearch);

        //we only want to send the expression if it is a new expression
        //therefore, we check equality based on the stringified expression
        filter.equalityComparer = function (oldValue, newValue) {
            return JSON.stringify(oldValue) === JSON.stringify(newValue);
        }
        // Update from fieldFilter:
        function updateFilter(v) {
            // Unsubscribe from value to avoid calling updateFilter:
            subscription.filter.dispose();

            var value = fieldFilter.value.peek() || [], // Get copy of value.
                comps = fieldFilter.type === "string" ? ["Contains", "StartsWith", "EndsWith"] : ["EqualTo", "LessThan", "NotEqualTo", "GreaterThan"],
                val;

            // all, list, or val

            /*
            // If no "In" operation, then check all:
            if (v) {
                if (value.indexOf("In") === -1) {
                    uncheckAll();
                }
            } else {
                checkAll();
            }*/

            // Set NotEmpty to false if not in list:
            if (value.indexOf("NotEmpty") === -1) {
                notEmpty(false);
            }

            // Set comparison1 to nothing if not a filter:
            if (value[0] === undefined || comps.indexOf(value[0].op) === -1) {
                comp.a(comps[0]);
                comp.valA(undefined);
            }
            // Set comparison2 to nothing if not a filter:
            if (value[1] === undefined || comps.indexOf(value[1].op) === -1) {
                comp.b(comps[0]);
                comp.valB(undefined);
            }

            value.forEach(function (filter, index) {
                if (filter.op === "In") {
                    // Apply In to all list items:
                    selectableListItems().forEach(function (item) {
                        item.selected(filter.values.indexOf(item.value) > -1);
                    });
                } else if (filter.op === "NotEmpty") {
                    // Apply notEmpty:
                    notEmpty(true);
                } else {
                    if (index === 0) {
                        comp.a(filter.op);
                        comp.valA(filter.values[0]);
                    } else {
                        comp.b(filter.op);
                        comp.valB(filter.values[0])
                    }
                }
            });

            // Push filters to
            filter(value);

            // Subscribe updateFilters to external observable again:
            subscription.filter = filter.subscribe(updateFieldFilter);
        }
        subscription.fieldValue = fieldFilter.value.subscribe(updateFilter);
        //we created our own filter observable
        //so that we can initialize it before grid is initialized.
        function updateFieldFilter(f) {
            // Unsubscribe from value to avoid calling updateFilters:
            subscription.fieldValue.dispose();
            // Update external observable:
            fieldFilter.value(f);
            // Subscribe updateFilters to external observable again:
            subscription.fieldValue = fieldFilter.value.subscribe(updateFilter);
        }
        subscription.filter = filter.subscribe(updateFieldFilter);

        //converts a list item to a selectable list item
        function option(value, selected) {
            return {
                selected: observable(has(selected) ? selected : allCheckbox()),
                value: has(value) ? value.toString() : ""
            };
        }

        //converts new listItems to selectableListItems
        listItems.subscribe(function (newItems) {
            //item selection persists when the list items are changed
            var filterValues = filter().length === 1 && filter()[0].op === 'In' ? filter()[0].values : [],
                items;

            if (filterValues.length > 0) {
                items = newItems.map(function (item) {
                    return option(item, filterValues.indexOf(item.toString()) > -1);
                });
            } else {
                items = newItems.groupJoin(selectableListItems(), "$.toString()", "$.value", function (o, i) {
                    return i.elementAtOrDefault(0, option(o));
                }).toArray();
            }

            selectableListItems(items);
        });

        //creates expression based on values
        valExpression = computed(function () {
            var expression = [];
            if (comp.valA()) {
                expression.push({
                    op: comp.a(),
                    values: [comp.valA()]
                });
            }

            if (comp.valB()) {
                expression.push({
                    op: comp.b(),
                    values: [comp.valB()]
                });
            }

            if (notEmpty()) {
                expression.push({
                    op: "NotEmpty",
                    values: []
                })
            }

            return expression.length > 0 ? expression : undefined;
        });

        //creates expression based on list items
        listExpression = computed(function () {
            var list = selectableListItems().filter(function (v) {
                return v.selected();
            });

            //if there is at least one list item checked and if all the items in the list are not selected 
            //then, there is a list expression
            //(but if all items are selected, it is a quick expression)
            if (list.length > 0 && list.length < selectableListItems().length) {
                return [{
                    op: 'In',
                    values: list.map(function (v) { return v.value })
                }];
            } else {
                return undefined;
            }
        });

        quickExpression = computed(function () {
            if (quickFilter()) {
                return [{
                    op: quickOp,
                    values: [quickFilter()]
                }];
            }
            //When all checkbox is true, quickSearch behaves like Quick Filter
            //when filter is closed quickSearch becomes undefined
            if (allCheckbox() && quickSearch()) {
                return [{
                    op: quickOp,
                    values: [quickSearch()]
                }];
            }

            return [];
        });


        filterOn = computed(function () {
            return filter().length > 0;
        });

        bindings = {
            comparisonA: comp.a,
            comparisonB: comp.b,
            valueA: comp.valA,
            valueB: comp.valB,
            quickSearch: quickSearch,
            all: allCheckbox,
            options: selectableListItems,
            popupTemplate: fieldFilter.type === "string" ? "string_filter_template" : "number_filter_template",
            value: quickFilter,
            filterOn: filterOn,
            flipped: flipped,
            notEmpty: notEmpty,
            loading: loading
        };


        function sendExpression(expression) {
            filter(expression || []);
        }

        function checkAll() {
            allCheckbox(true);
            selectableListItems().forEach(function (v) {
                v.selected(true);
            });
        }

        function uncheckAll() {
            allCheckbox(false);
            selectableListItems().forEach(function (v) {
                v.selected(false);
            });
        }

        function getSelectedItems() {
            return selectableListItems().filter(function (v) {
                return v.selected();
            });
        }

        function clearValue() {
            comp.valA(undefined);
            comp.valB(undefined);
            notEmpty(false);
        }

        function initializeFilter($node) {
            //using jQuery instead of knockout because bindings have already been applied to the filter,
            //however we need to add a click event to the filter button so that when it is clicked
            //'filter.shown' state is entered.
            $filter = $($node.find('.slick-filter')[0]);
            $filter.click(function () {
                //creates the popup div lazily, but only once
                if (!$popup) {
                    $popup = $('<div class="slick-filter-popup" data-bind="template: { name: popupTemplate, data: $data}"></div>').appendTo('body');
                    ko.applyBindings(bindings, $popup.get()[0]);
                }

                //flip is boolean; sets 'flipped' observable in order to show the correct ui if filter is flipped (left/right)
                //also returns the offset which needs to be applied to the popup if it is flipped
                function flipFilter(flip) {
                    flipped(flip);
                    if (flip) {
                        return $filter.offset().left - $popup.width() - column.width + 10;
                    }
                    return $filter.offset().left + 20;
                }

                //calculates the offset of the filter from the top/left corner of the window
                var offsetX = flipFilter($filter.offset().left + 10 + $popup.width() > window.innerWidth),
                    offsetY = $filter.offset().top + $popup.height() > window.innerHeight ? window.innerHeight - $popup.height() : $filter.offset().top - 10;

                send('filter.open');

                //creates the popup which is the filter
                $popup.bPopup({
                    follow: [false, false],
                    position: [offsetX, offsetY],
                    opacity: 0,
                    speed: 0,
                    onClose: function () {
                        send('filter.close');
                    }
                });

                //sets the correct position of the arrow on the filter
                var arrow = $popup.find('div')[0];
                $(arrow).css("top", $filter.offset().top - offsetY);
            });
        }

        /*
        removed filter.loading stage and filter.ready stage 
        because quick search now is updated continuously when quick filter changes
        moved subs to list and value outside of the hidden substate in the logical states 
        because now we must react to changes when its closed due to saving
        */

        function createStatechart() {

            return statechart(
                parallel('filter',
                onEntry(function () {
                    send = this.send;
                    this.initial = true;
                }),
                state('filter.view',
                    state('filter.hidden',
                            onEntry(function (e, isIn) {
                                var stateProp = this,
                                    sub;

                                subscription.quickSearchSub = quickSearch.subscribe(function (v) {
                                    quickFilter(v);
                                });

                                subscription.quickSub = quickFilter.subscribe(function (v) {
                                    // Prevent circular dependency by disposing quickSearch subscription:
                                    subscription.quickSearchSub.dispose();
                                    // Update quickSearch:
                                    quickSearch(v);
                                    // Resubscribe to quickSearch:
                                    subscription.quickSearchSub = quickSearch.subscribe(function (v) {
                                        quickFilter(v);
                                    });
                                    if (!isIn('filter.model.all')) {
                                        send('filter.all');
                                    }
                                });

                                if (this.initial) {
                                    updateFilter(fieldFilter.value());
                                    updateQuickSearch(fieldFilter.quickSearch());
                                    this.initial = false;
                                }
                            }),
                        onExit(function () {
                            subscription.quickSearchSub.dispose();
                            subscription.quickSub.dispose();
                        }),
                            on('filter.open', goto('filter.shown'))
                        ),
                    state('filter.shown',
                           onEntry(function () {
                               //move open logic here

                               loading(true);

                               //wait for list to load 
                               var loadingSub = listItems.subscribe(function () {
                                   loading(false);
                                   loadingSub.dispose();
                               });

                               // Initialize list:
                               quickSearch.valueHasMutated();
                           }),
                            on('filter.close', goto('filter.hidden')))
                ),
                state('filter.model',
                /*
                    state('filer.model.initial', 
                        onEntry(function () {
                            // 1. move updateFilter, updateQuickSearch here
                            // 2. do dispatch
                            send('filter.lis', { internal: true });

                        })),*/
                    state('filter.model.all',
                        onEntry(function (e) {
                            //update ui
                            checkAll();
                            clearValue();

                            sendExpression(quickExpression());

                            subscription.list = listExpression.subscribe(function (expression) {
                                if (expression) {
                                    //if there is an expression, go to list
                                    send('filter.list');
                                } else if (getSelectedItems().length === 0) {
                                    //if there are selected items and no expression, go to value
                                    send('filter.value');
                                }
                            });
                            subscription.value = valExpression.subscribe(function () {
                                send('filter.value');
                            });
                        }),
                        onExit(function () {
                            subscription.list.dispose();
                            subscription.value.dispose();
                        }),
                        state('filter.all.hidden',
                            onEntry(function () {
                                this.quickSubAll = quickFilter.subscribe(function (v) {
                                    sendExpression(quickExpression());
                                });
                            }),
                            onExit(function () {
                                this.quickSubAll.dispose();
                            }),
                            whenIn('filter.shown', goto('filter.all.shown'))),
                        state('filter.all.shown',
                            onEntry(function () {
                                quickFilter(quickSearch());
                                //subscribe to changes in the ui
                                subscription.all = allCheckbox.subscribe(function (isChecked) {
                                    if (!isChecked) {
                                        send('filter.value');
                                    }
                                });
                                subscription.quick = quickSearch.subscribe(function (v) {
                                    if (v !== undefined) {
                                        quickFilter(quickSearch());
                                        sendExpression(quickExpression());
                                    }
                                });
                            }),
                            onExit(function () {
                                //change this to unsubscribe or composite disposable
                                subscription.all.dispose();
                                subscription.quick.dispose();
                            }),
                            whenIn('filter.hidden', goto('filter.all.hidden')))
                    ),
                    state('filter.model.list',
                        onEntry(function () {
                            //update ui
                            allCheckbox(false);
                            clearValue();

                            sendExpression(listExpression());

                            subscription.list = listExpression.subscribe(function (expression) {
                                if (expression) {
                                    // if there is an expression, send it
                                    sendExpression(expression);
                                } else if (getSelectedItems().length === 0) {
                                    // if its empty, go to value
                                    send('filter.value');
                                } else {
                                    // else, all are selected
                                    send('filter.all');
                                }
                            });
                            subscription.value = valExpression.subscribe(function (v) {
                                send('filter.value');
                            });
                        }),
                            onExit(function () {
                                subscription.list.dispose();
                                subscription.value.dispose();
                            }),
                        state('filter.list.hidden', whenIn('filter.shown', goto('filter.list.shown'))),
                        state('filter.list.shown',
                            onEntry(function () {
                                quickFilter("");
                                subscription.all = allCheckbox.subscribe(function () {
                                    send('filter.all');
                                });
                            }),
                            onExit(function () {
                                subscription.all.dispose();
                            }),
                            whenIn('filter.hidden', goto('filter.list.hidden')))
                    ),
                    state('filter.model.value',
                            onEntry(function (e) {
                                //update ui
                                uncheckAll();
                                quickFilter("");

                                sendExpression(valExpression());

                                subscription.list = listExpression.subscribe(function (expression) {
                                    if (expression) {
                                        // if there is an expression, go to list
                                        send('filter.list');
                                    } else if (getSelectedItems().length > 0) {
                                        // if there are items, go to all
                                        send('filter.all');
                                    }
                                });
                                subscription.value = valExpression.subscribe(function (expression) {
                                    sendExpression(expression);
                                });
                            }),
                            onExit(function () {
                                subscription.list.dispose();
                                subscription.value.dispose();
                            }),
                        state('filter.value.hidden', whenIn('filter.shown', goto('filter.value.shown'))),
                        state('filter.value.shown',
                            onEntry(function (e) {
                                //subscribe to changes in ui
                                subscription.all = allCheckbox.subscribe(function (v) {
                                    send('filter.all');
                                });
                            }),
                            onExit(function () {
                                subscription.all.dispose();
                            }),
                            whenIn('filter.hidden', goto('filter.value.hidden')))
                    ),
                    on('filter.all', gotoInternally('filter.model.all')),
                    on('filter.list', gotoInternally('filter.model.list')),
                    on('filter.value', gotoInternally('filter.model.value'))
                )));
        }

        var filterStatechart = createStatechart();

        var initalized = false;
        function start() {
            filterStatechart.start();
        }

        return {
            bindings: bindings,
            start: start,
            initalized: initalized,
            init: initializeFilter
        }
    }

    /*jslint unparam: true*/
    return function observableFilters() {
        function init(grid) {
            grid.onHeaderRowCellRendered.subscribe(function (e, args) {
                var $node = $(args.node),
                    node = $node[0],
                    fieldFilter = args.column.filter,
                    filterHtml = '<input type="text" data-bind="value: value, valueUpdate: \'afterkeydown\'"/>'
                    + '<div class="slick-filter" data-bind="css: { iconFilterOff: !filterOn(), iconFilterOn: filterOn }"></div>';

                if (fieldFilter) {
                    if (!fieldFilter.state) {
                        fieldFilter.state = setupFilter(fieldFilter, args.column)
                    }
                    $node.html(filterHtml);
                    ko.applyBindings(fieldFilter.state.bindings, node);
                    fieldFilter.state.init($node);
                    if (!fieldFilter.state.initalized) {
                        fieldFilter.state.start();
                        fieldFilter.state.initialized = true;
                    }
                }
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