
module.exports = ( grunt ) ->

    analysis = require 'rjs-build-analysis'

    build:
        options:
            baseUrl: 'src'
            include: '<%=package.name%>'
            exclude: ['bPopup'
                , 'knockout'
                , 'requirejs' 
                , 'scalejs'
                , 'scalejs.mvvm'
                , 'knockout.mapping'
                , 'scalejs.functional'
                , 'text'
                , 'slick.core'
                , 'slick.dataview'
                , 'slick.grid'
                , 'slick.rowselectionmodel'
                , 'bpopup'
                , 'linqjs' 
                , 'scalejs.statechart-scion'
                , 'scalejs.linq-linqjs'
                , 'jquery'
                , 'antiscroll'
            ]
            mainConfigFile: 'rjsconfig.js'
            out: 'build/<%=package.name%>.js'
            optimize: 'none'
            done: ( done, output ) ->
                duplicates = analysis.duplicates output

                if duplicates.length > 0
                    grunt.log.subhead 'Duplicates found in requirejs build: '
                    grunt.log.warn duplicates
                    done new Error 'r.js build duplicate modules, please check the excludes option.'
                else
                    done()


