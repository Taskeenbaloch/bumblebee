import Vue from 'vue'

export const state = () => ({
	datasets: [],
  datasetConfig: [], // TODO
  datasetSelection: [],
  previewFunctions: [],
	databases: [],
  buffers: [],
  windows: [],
  tableViews: [],
  cells: [],
  columnsPreviews: [],
  highlightRows: [],
  highlights: [],
  focusedColumns: [],
	datasetUpdates: 0,
  status: 'waiting',
  session: '',
  engine: 'dask',
  key: '',
	allTypes: [
		'string',
		'int',
		'decimal',
		'date',
		'boolean',
		'binary',
		'array',
		'null'
	],
  datasetCounter: 1,
  kernel: false,
  nextCommand: false,
  tab: 0
})

export const mutations = {

  setTab (state, { tab }) {
    state.tab = tab
  },

  setColumnsPreview (state, payload) {
    Vue.set( state.columnsPreviews, state.tab, payload )
  },

  setHighlightRows (state, {indices, color}) {
    var highlightRows = { indices: indices || [], color: color || 'green' }

    Vue.set( state.highlightRows, state.tab, highlightRows )
  },

  setHighlights (state, { matches, color }) {
    var highlights = { matches: matches || {}, color: color || 'green' }

    Vue.set( state.highlights, state.tab, highlights )
  },

  setFocusedColumns (state, column) {
    Vue.set( state.focusedColumns, state.tab, column )
  },

  previewDefault (state) {
    Vue.set(state.columnsPreviews,state.tab,false)
    Vue.set(state.highlights,state.tab,false)
    Vue.set(state.highlightRows,state.tab,false)
    Vue.set(state.focusedColumns,state.tab,false)
    Vue.set(state.previewFunctions,state.tab,false)
    Vue.set(state.buffers,state.tab,false)
  },

  commandHandle(state, command) {
    state.nextCommand = command
  },

  setWindow(state, window) {
    if (!state.windows[state.tab] || state.windows[state.tab].join()!==window.join()) {
      Vue.set(state.windows,state.tab,window)
    }
  },

  setTableView(state, tableView) {
    Vue.set(state.tableViews,state.tab,tableView)
  },

  setPreviewFunction(state, func) {
    Vue.set(state.previewFunctions,state.tab,func)
  },

	add (state, { dataset }) {

    console.log("[BUMBLEBLEE] Opening dataset",dataset)

    if (dataset.name===null){
      if (dataset.file_name){
        dataset.name = dataset.file_name.split('.')[0]
      }
      else {
        dataset.name = `Dataset${state.datasetCounter}`
        state.datasetCounter = state.datasetCounter + 1
      }

    }

		let found = state.datasets.findIndex((e) => {
			return (e.name === dataset.name)
    })

    if (found === -1) {
      found = state.datasets.findIndex((e) => {
        return (!e.summary)
      })
    }

		if (found === -1) {
			found = state.datasets.length
    }

    dataset.varname = 'df' // TODO: multiple dfs

    /*
    if (found>=1)
      dataset.varname = `df${found}`
    else
      dataset.varname = 'df'
    */

    if (dataset.columns instanceof Object) { dataset.columns = Object.values(dataset.columns) }

    var _c
    try {
      _c = state.datasetSelection[found].columns
    }
    catch (err) {
      _c = []
    }

    if (dataset && dataset.dtypes_list)
      state.typesAvailable = dataset.dtypes_list

    Vue.set(state.datasets, found, dataset)

    state.datasetSelection[found] = {} // {columns: _c} // TODO: check selection

    Vue.set(state.datasetSelection, found, state.datasetSelection[found] )

		state.status = 'received'

    state.datasetUpdates = state.datasetUpdates + 1

  },

  addNew (state) {

    let found = state.datasets.length

    let dataset = {
      name: '(new dataset)',
      blank: true
    }

    state.status = 'received'

    Vue.set(state.datasets, found, dataset)
    Vue.set(state.datasetSelection, found, {})

		state.datasetUpdates = state.datasetUpdates + 1

  },

  resetDataset (state) {
    state.datasets = []

    let found = state.datasets.length

    let dataset = {
      name: '(new dataset)',
      blank: true
    }

    state.status = 'received'

    Vue.set(state.datasets, found, dataset)
    Vue.set(state.datasetSelection, found, {})

		state.datasetUpdates = state.datasetUpdates + 1
  },

	delete (state, { index }) {
    Vue.delete(state.datasets, index)
    Vue.delete(state.datasetSelection, index)
		if (!state.datasets.length) {
			state.status = 'receiving back'
		}
		return index
	},

	status (state, payload) {
    state.status = payload || 'waiting'
  },

	session (state, payload) {
    state.session = payload
  },

  engine (state, payload) {
    state.engine = payload
  },

  cells (state, payload) {
    state.cells = payload
  },

  cellContent (state, {index, content}) {
    try {
      state.cells[index].content = content
    } catch (error) {
      console.error(error)
    }
  },

  database (state, payload) {
    Vue.set(state.databases,state.tab,payload)
  },

	setBuffer (state, payload) {
    Vue.set(state.buffers,state.tab,payload)
  },

	key (state, payload) {
    state.key = payload
  },

  kernel (state, payload) {
    state.kernel = payload
  },

  selection (state, {tab, columns, ranged, clear} ) {
    if (tab===undefined) {
      tab = state.tab
    }
    if (tab!==undefined) {

      Vue.set(state.columnsPreviews,state.tab,false)
      Vue.set(state.highlights,state.tab,false)
      Vue.set(state.highlightRows,state.tab,false)
      Vue.set(state.focusedColumns,state.tab,false)
      Vue.set(state.previewFunctions,state.tab,false)
      Vue.set(state.buffers,state.tab,undefined)

      if (clear) {
        Vue.set(state.datasetSelection,tab,{
          columns: [],
          ranged: undefined
        })
        return
      }

      var columnsSelected = (columns !== undefined) ? columns : (state.datasetSelection[tab]) ? state.datasetSelection[tab].columns || [] : []
      columnsSelected = (ranged !== undefined) ? [] : columnsSelected

      var rangedSelected = (columnsSelected.length) ? {} : (ranged !== undefined) ? ranged : (state.datasetSelection[tab]) ? state.datasetSelection[tab].ranged || {} : {}

      Vue.set(state.datasetSelection,tab,{
        columns: columnsSelected,
        ranged: rangedSelected,
      })
    }
  }

}

export const getters = {
  currentDataset(state) {
    return state.datasets[state.tab]
  },
  currentSelection(state) {
    return state.datasetSelection[state.tab] || []
  },
  currentColumnsPreview (state) {
    return state.columnsPreviews[state.tab] || false
  },
  currentHighlightRows (state) {
    return state.highlightRows[state.tab] || false
  },
  currentHighlights (state) {
    return state.highlights[state.tab] || false
  },
  currentFocusedColumns (state) {
    return state.focusedColumns[state.tab] || undefined
  },
  currentTab(state) {
    return state.tab
  },
  currentTableView(state) {
    return state.tableViews[state.tab] || false
  },
  currentBuffer(state) {
    try {
      return state.buffers[state.tab]
    }
    catch (error) {
      return false
    }
  },
  currentPreviewFunction(state) {
    try {
      return state.previewFunctions[state.tab]
    }
    catch (error) {
      return false
    }
  },
  currentWindow(state) {
    try {
      return state.windows[state.tab]
    }
    catch (error) {
      return false
    }
  },
  selectionType(state) {
    var _ds = state.datasetSelection[state.tab] || []
    if (_ds && _ds.ranged &&  _ds.ranged.values && _ds.ranged.values.length) {
      return 'values'
    }
    if (_ds && _ds.ranged && _ds.ranged.ranges && _ds.ranged.ranges.length) {
      return 'ranges'
    }
    return 'columns'
  },
  typesAvailable(state) {
    return state.datasets[state.tab].dtypes_list || state.allTypes
  }
}
