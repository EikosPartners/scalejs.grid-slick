define([
    'scalejs!core', 'scalejs!application'
], function(
    core
) {
    var grid = core.grid;

    // For deeper testing, log to console
    console.log('core.grid: ', grid);

    describe('core.grid', function() {

        it('is defined', function() {
            expect(grid).toBeDefined();
        });

    });
});

