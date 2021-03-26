const tileIds = [//Note: order here determines texture order for 'main'
    'ag',
    'plots',
    'water',
    'urban',
    'major_rd',
    'slope',
    'ex_urb',
    'corr',
    'nodes',
    'urban_core',
    'aoi',
];

const weightingsData = [
    {
        name: 'Ag_Raster',
        prop: 'Ag',
        tileId: 'ag',
        match: 10,
        score: {initial: -10, min: -50, max: 0}
    }, {
        name: 'Urban_Raster',
        prop: 'ExistingUrban',
        tileId: 'ex_urb',
        match: 1,
        score: {initial: 100, min: 0, max: 150}
    },
    {
        name: 'Water_Raster',
        prop: 'Water',
        tileId: 'water',
        match: 110,//value of 'water' in this layer
        score: {initial: -50, min: -100, max: 0}
    },
    {
        name: 'Euclidean_Urban',
        prop: 'Urban',
        tileId: 'urban',
        graduated: true,
        specialMath: true,
        score: {initial: 15, min: 0, max: 30},
        distance: {initial: 1000, min: 500, max: 2000}
    },
    {
        name: 'UrbanCore_Euc',
        prop: 'UrbanCore',
        tileId: 'urban_core',
        graduated: true,
        specialMath: true,
        score: {initial: 2.5, min: 1, max: 3},
        distanceRange: {
            min:{initial: 1000, min: 0, max: 2000},
            max:{initial: 4500, min: 1000, max: 10000}
        },
    },
    {
        name: 'Euc_Roads',
        prop: 'Roads',
        tileId: 'major_rd',
        graduated: true,
        score: {initial: 10, min: 0, max: 30},
        distance: {initial: 1000, min: 500, max: 2000}
    },
    {
        name: 'Plots_Raster',
        prop: 'Plots',
        tileId: 'plots',
        match: 1,
        score: {initial: -10, min: -50, max: 0}
    },
    {
        name: 'Corr_Euc',
        prop: 'Corr',
        tileId: 'corr',
        graduated: true,
        score: {initial: 20, min: 0, max: 30},
        distance: {initial: 1000, min: 500, max: 2000}
    },
    {
        name: 'Nodes_Euc',
        prop: 'Nodes',
        tileId: 'nodes',
        graduated: true,
        score: {initial: 10, min: 0, max: 30},
        distance: {initial: 1000, min: 500, max: 2000}
    },
];
