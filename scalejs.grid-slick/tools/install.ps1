param($installPath, $toolsPath, $package, $project)

$project |
	Add-Paths "{
		'scalejs.grid-slick'		: 'Scripts/scalejs.grid-slick-$($package.Version)',
		'jquery.event.drag'			: 'Scripts/jquery.event.drag',
		'jquery.event.drag.live'	: 'Scripts/jquery.event.drag',
		'slick.core'				: 'Scripts/slick.core',
		'slick.grid'				: 'Scripts/slick.grid',
		'slick.dataview'			: 'Scripts/slick.dataview',
		'slick.rowselectionmodel'	: 'Scripts/slick.rowselectionmodel'
	}" |
	Add-ScalejsExtension 'scalejs.grid-slick' |
	Add-Shims "{
			'jquery.event.drag'	: {
				deps: ['jQuery']
			},
			'jquery.event.drag.live'	: {
				deps: ['jquery.event.drag']
			},
			'slick.core'		: {
				deps	: ['jQuery'],
				exports	: 'Slick'
			},
			'slick.dataview': {
				deps: ['slick.core']
			},
			'slick.rowselectionmodel': {
				deps: ['slick.core']
			},
			'slick.grid'		: {
				deps	: [
					'slick.core', 
					'slick.dataview',
					'slick.rowselectionmodel',
					'jquery.event.drag'
				],
				exports	: 'Slick'
			}
		}" |
	Out-Null