param($installPath, $toolsPath, $package, $project)

$project |
	Remove-Paths 'scalejs.grid-slick, slick.grid, slick.core, slick.rowselectionmodel' |
	Remove-ScalejsExtension 'scalejs.grid-slick' |
	Remove-Shims 'slick.grid, slick.core, slick.dataview, slick.rowselectionmodel'
	Out-Null
