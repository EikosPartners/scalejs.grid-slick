/*global define, console*/
/// <reference path="../Scripts/_references.js" />
define([
    'scalejs!core',
    'jQuery',
    'knockout',
    'text!./filters.html',
    'bPopup',
    'scalejs.statechart-scion'
], function (
    core,
    $,
    ko,    
    filterTemplates
) {
    /// <param name="ko" value="window.ko" />
    'use strict';
    var statechart = core.state.builder.statechart,
        state = core.state.builder.state,
        on = core.state.builder.on,
        onEntry = core.state.builder.onEntry,
        onExit = core.state.builder.onExit,
        goto = core.state.builder.goto,
        gotoInternally = core.state.builder.gotoInternally,
        observable = ko.observable,
        computed = ko.computed,
        observableArray = ko.observableArray,
        unwrap = ko.utils.unwrapObservable,
        registerTemplates = core.mvvm.registerTemplates;

    registerTemplates(filterTemplates);

    function option(name) {
        return {
            selected: observable(true),
            name: name.toString()
        };
    }

    function getOperation(comp) {
        var ret = "";
        switch (comp()) {
            case "=":
                ret = "EqualTo";
                break;
            case ">":
                ret = "GreaterThan";
                break;
            case "<":
                ret = "LessThan";
                break;
            case "!=":
                ret = "NotEqualTo";
                break;
            case "contains":
                ret = "Contains";
                break;
            case "starts":
                ret = "StartsWith";
                break;
            case "ends":
                ret = "EndsWith"
                break;
        }
        return ret;
    };

    function setupFilter(fieldFilter, $node, node, column) {
        var filter = fieldFilter.value,
            quickSearch = fieldFilter.quickSearch || observable(),
            comp = {
                a: observable(),
                valA: observable(),
                b: observable(),
                valB: observable()
            },
            allCheckbox = observable(true),
            listItems = fieldFilter.values,
            quickFilter = observable(),
            selectableListItems = computed(function () {
                return unwrap(listItems).map(option);
            }),
            valExpression = computed(function () {
                var expression;
                if (comp.valA()) {
                    expression = [{
                        op: getOperation(comp.a),
                        values: [comp.valA()]
                    }];

                    if (comp.valB()) {
                        expression.push({
                            op: getOperation(comp.b),
                            values: [comp.valB()]
                        });
                    }
                }
                return expression;
            }),
            listExpression = computed(function () {
                var list = selectableListItems().filter(function (v) {
                    return v.selected();
                });

                if (list.length > 0 && list.length < selectableListItems().length) {
                    return [{
                        op: 'In',
                        values: list.map(function (v) { return v.name })
                    }];
                }

                if (allCheckbox() && quickSearch()) {
                    return [{
                        op: fieldFilter.quickFilterOp || 'StartsWith',
                        values: [quickSearch()]
                    }];
                }
            }),
            writeExpression = computed(function () {
                if (!quickFilter()) {
                    return undefined
                }
                return [{
                    op: fieldFilter.quickFilterOp || 'StartsWith',
                    values: [quickFilter()]
                }];
            }),
            filterOn = computed(function () {
                if (quickFilter()) {
                    return false;
                }
                return listExpression() || valExpression();
            }),
            flipped = observable(false),
            subscription = {},
            bindings,
            $filter,
            $popup,
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
                flipped: flipped
            };


        ko.applyBindings(bindings, node);

        function sendExpression() {
            var ret = (writeExpression() || listExpression() || valExpression() || []);

            console.log(ret);
            console.log(filter());
            if (JSON.stringify(ret) !== JSON.stringify(filter())) {
                filter(ret);
            }
        }

        function checkAll() {
            selectableListItems().forEach(function (v) {
                v.selected(true);
            });
            allCheckbox(true);
        }

        function uncheckAll() {
            selectableListItems().forEach(function (v) {
                v.selected(false);
            });
            allCheckbox(false);
        }

        function subscribe(raise, e) {
            console.log('Subscribing');
            subscription.all = allCheckbox.subscribe(function (v) {
                quickFilter(undefined);
                typeof e.all === "string" ? raise(e.all) : e.all(raise, v);
            });
            subscription.list = listExpression.subscribe(function (v) {
                quickFilter(undefined);
                typeof e.list === "string" ? raise(e.list) : e.list(raise, v);
            });
            subscription.value = valExpression.subscribe(function (v) {
                quickFilter(undefined);
                typeof e.value === "string" ? raise(e.value) : e.value(raise, v);
            });
        }

        function selectedItems() {
            return selectableListItems().filter(function (v) {
                return v.selected();
            });
        }

        function sendListExpression(raise) {
            if (selectedItems().length === 0 || listExpression()) {
                sendExpression();
            } else {
                raise('filter.empty');
            }
        }

        function unsubscribe() {
            console.log('unsubscribing.');
            subscription.all.dispose();
            subscription.list.dispose();
            subscription.value.dispose();
        }

        function clearValue() {
            comp.valA(undefined);
            comp.valB(undefined);
        }

        function createStatechart() {
            return statechart(
            state('filter',
                onEntry(function () {
                    filter([]);
                    var statechart = this;
                    $filter = $($node.find('.slick-filter')[0]);
                    $filter.click(function () {
                        if (!$popup) {
                            $popup = $('<div class="slick-filter-popup" data-bind="template: { name: popupTemplate, data: $data}"></div>').appendTo('body');
                            ko.applyBindings(bindings, $popup.get()[0]);
                        }

                        function flipFilter(flip) {
                            flipped(flip);
                            if (flip) {
                                return $filter.offset().left - $popup.width() - column.width + 10;
                            }
                            return $filter.offset().left + 20;
                        }


                        var offsetX = flipFilter($filter.offset().left + 10 + $popup.width() > window.innerWidth),
                            offsetY = $filter.offset().top + $popup.height() > window.innerHeight ? window.innerHeight - $popup.height() : $filter.offset().top - 10;

                        statechart.send('filter.open');
                        $popup.bPopup({
                            follow: [false, false],
                            position: [offsetX, offsetY],
                            opacity: 0,
                            speed: 0,
                            onClose: function () {
                                statechart.send('filter.close');
                            }
                        });
                        var arrow = $popup.find('div')[0];
                        $(arrow).css("top", $filter.offset().top - offsetY);
                    });
                }),
                on('filter.open', gotoInternally('filter.shown')),
                on('filter.close', gotoInternally('filter.hidden')),
                state('filter.hidden', //parses quickFilter and sends expressions immediately         
                    onEntry(function () {
                        this.quickFilterSub = quickFilter.subscribe(function (value) {
                            sendExpression();
                        });
                    }),
                    onExit(function () {
                        this.quickFilterSub.dispose();
                    })),
                state('filter.shown',
                    onEntry(function () {
                        quickSearch("");
                        if (quickFilter()) {
                            this.send('filter.empty');
                        } else if (listExpression()) {
                            this.send('filter.list');
                        } else if (valExpression()) {
                            this.send('filter.value');
                        } else {
                            this.send('filter.none');
                        }
                    }),
                    on('filter.empty', gotoInternally('filter.all.selected')),
                    on('filter.list', gotoInternally('filter.all.deselected.list')),
                    on('filter.value', gotoInternally('filter.all.deselected.value')),
                    on('filter.none', gotoInternally('filter.all.deselected.none')),
                    state('filter.all.waiting'),
                    state('filter.all.selected',
                        onEntry(function (e) {
                            checkAll();
                            clearValue();
                            sendExpression();
                            subscribe(this.send, {
                                all: 'filter.none',
                                list: function (raise, v) {
                                    //so that when a filter is entered, we only redirect to the 
                                    //deselected.list state if there is actually a list value selected.
                                    if (v) {
                                        raise('filter.list');
                                    }
                                },
                                value: 'filter.value'
                            });
                        }),
                        onExit(function () {
                            unsubscribe();
                        })),
                    state('filter.all.deselected',
                        state('filter.all.deselected.none',
                            onEntry(function (e) {
                                uncheckAll();
                                clearValue();
                                sendExpression();
                                subscribe(this.send, {
                                    all: 'filter.empty',
                                    list: 'filter.list',
                                    value: 'filter.value'
                                });
                            }),
                            onExit(function () {
                                unsubscribe();
                            })),
                       state('filter.all.deselected.list',
                           onEntry(function (e) {
                               allCheckbox(false);
                               clearValue();
                               sendExpression();
                               subscribe(this.send, {
                                   all: 'filter.empty',
                                   list: sendListExpression,
                                   value: 'filter.value'
                               });
                           }),
                            onExit(function () {
                                unsubscribe();
                            })),
                        state('filter.all.deselected.value',
                            onEntry(function (e) {
                                uncheckAll();
                                sendExpression();
                                subscribe(this.send, {
                                    all: 'filter.empty',
                                    list: 'filter.list',
                                    value: sendExpression
                                });
                            }),
                            onExit(function () {
                                unsubscribe();
                            }))))));
        }

        filterStatechart = createStatechart();

        filterStatechart.start();
    }

    /*jslint unparam: true*/
    return function observableFilters(opts) {
        function init(grid) {
            grid.onHeaderRowCellRendered.subscribe(function (e, args) {
                var $node = $(args.node),
                    node = $node[0],
                    fieldFilter = args.column.filter,
                    filterHtml = '<input type="text" data-bind="value: value, valueUpdate: \'afterkeydown\'"/><div class="slick-filter" data-bind="css: { iconFilterOff: !filterOn(), iconFilterOn: filterOn }"></div>',
                    $filter,
                    bindings,
                    $popup;


                if (fieldFilter) {
                    $node.html(filterHtml);
                    setupFilter(fieldFilter, $node, node, args.column);
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