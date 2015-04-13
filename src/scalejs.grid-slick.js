/*global define*/
define([
    './scalejs.grid-slick/slickGrid',
    'knockout',
    'scalejs.linq-linqjs'
], function (
    slickGrid,
    ko
) {
    'use strict';

    ko.bindingHandlers.slickGrid = slickGrid;
});

