
const _indexedPngDb = () => {
    const MAX_VALUE = 255 * 256 * 256 - 1;

    const _db = new pngDb.PngDBReader();
    const _valToRGB = (value) => {
        if (value < 0) {
            return [0, 0, 0, 0];
        }
        if (value > 255) {
            let r = 0;
            const b = value % 256;
            let g = Math.floor(value / 256);

            if (g > 255) {
                r = Math.floor(g / 256);
                g = g % 256;
            }
            if (r > 255) {
                console.warn('MAX VALUE VIOLATION: ' + value);
                r = 255;
            }
            return [r, g, b, 255];
        } else {
            return [0, 0, value, 255];
        }
    };
    const _rgbToVal = (color) => {
        return color.r << 16 | color.g << 8 | color.b;
    };
    const _withRecords = (fn) => {
        _db.records.forEach((record, i) => {
            fn(record);
        });
    };
    const _loadDataFiles = (path, callback) => {
        _db.load(path).then(() => {
            Object.keys(_db.fields).forEach(function (fieldName) {
                _db.loadField(fieldName).then(() => {
                    console.log('Loaded: ' + fieldName);
                })
            });
            if (callback) callback(_db);
        });
    };
    const _recordsByIndex = (start, stop) => {
        const ans = [];
        for (let i = start; i < stop; i++) {
            if (!_db.records[i]) {
                console.log('Missing record: ' + i);
                continue;
            }
            ans.push(_db.records[i]);
        }
        return ans;
    };

    const _addRecordsByIndexColor = (records, start, stop) => {
        const startIdx = _rgbToVal(start);
        const stopIdx = _rgbToVal(stop);
        [].push.apply(records, _recordsByIndex(startIdx, stopIdx));
    };

    return {
        MAX_VALUE: MAX_VALUE,
        valToRGB: _valToRGB,
        rgbToVal: _rgbToVal,
        loadDataFiles: _loadDataFiles,
        withRecords: _withRecords,
        recordsByIndex: _recordsByIndex,
        addRecordsByIndexColor: _addRecordsByIndexColor
    };
};
const indexedPngDb = _indexedPngDb();
