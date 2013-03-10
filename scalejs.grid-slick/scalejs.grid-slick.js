/*global define*/
define([
    './scalejs.grid-slick/slickGrid',
    'knockout'
], function (
    slickGrid,
    ko
) {
    'use strict';

    ko.bindingHandlers.slickGrid = slickGrid;
});

