/**
 * User: kgoulding
 * Date: 4/30/2018
 * Time: 4:31 PM
 */
SAS = (typeof SAS === 'undefined') ? {} : SAS;
(function () { // self-invoking function
    /**
     * @class SAS.OutputChart
     **/
    SAS.OutputChart = function (colors) {
        var _self = this;

        //region private fields and methods
        const _totals = {};
        const _series = {};
        const _colors = {};
        Object.keys(colors).forEach((k) => {
            if (_hidden.indexOf(k) >= 0) return;
            _colors[k] = colors[k];
        });
        let _useNormalLine = true;
        let _normalizeYValues = true;
        let _ctx;
        let _currentX = 0;
        let _title = 'Trip Times';
        let _filterKeys = {};
        var _init = function () {
            const canvas = document.getElementById('chartCanvas');
            _ctx = canvas.getContext('2d');

            _reset();
        };

        const _include = (k) => {
            if (!_filterKeys || Object.keys(_filterKeys).length === 0) {
                return true;
            }
            return _filterKeys[k];
        };

        const _reset = function () {
            Object.keys(_colors).forEach((k) => {
                _totals[k] = 0;
                _series[k] = [];
            });
        };

        function _drawText(size, text, color, x, y) {
            _ctx.font = size + "px Arial";
            _ctx.fillStyle = color;
            _ctx.fillText(text, x, y);
        }

        function _drawTitle() {
            _drawText(40, _title, '#aaaaaa', 10, 50)
        }

        function _drawSummary() {
            let ry = 60;
            // const xBase = 10;
            // orderedCategories.forEach((k, i) => {
            //     if (!_include(k)) return;
            //     if (!_series[k]) return;
            //     ry += 30;
            //     _drawText(18, k, _colors[k], xBase + 70, ry - 1);
            //     _series[k].forEach((pt, i) => {
            //         if (pt.x === _currentX) {
            //             _drawText(20, pt.y, _colors[k], xBase + 10, ry);
            //         }
            //     });
            // });
        }

        function _drawNormalLine(maxVal, h, xStep) {
            Object.keys(_series).forEach((k) => {
                if (!_include(k)) return;

                let series = _series[k];
                const max = {x: 0, y: 0};
                series.forEach((pt, i) => {
                    max.x = Math.max(max.x, pt.x);
                    max.y = Math.max(max.y, pt.y);
                });
                if (max.y === 0 || max.x === 0) return;

                const steps = 20;
                let arbMaxSq = max.x * max.x;
                let normalizedRatio = max.y / arbMaxSq;

                _ctx.beginPath();
                _ctx.strokeStyle = _colors[k];
                _ctx.setLineDash([2, 10]);

                for (let x = 0; x <= max.x; x += max.x / steps) {
                    let norm = x * x * normalizedRatio;
                    const yPos = _calcY(h, norm, maxVal);
                    const xPos = x * xStep;
                    if (x === 0) {
                        _ctx.moveTo(xPos, yPos);
                    } else {
                        _ctx.lineTo(xPos, yPos);
                    }
                }
                _ctx.stroke();
                _ctx.setLineDash([]);
            });
        }

        const _calcY = (h, y, maxVal) => {
            if (_normalizeYValues) {
                return h - h * Math.sqrt(y) / Math.sqrt(maxVal);
            }
            return h - h * y / maxVal;
            // _normalizeYValues
        };

        const _draw = function () {
            const canvas = document.getElementById('chartCanvas');
            _ctx.clearRect(0, 0, canvas.width, canvas.height);

            const w = canvas.width;
            const h = canvas.height - 20;

            _drawTitle();
            _drawSummary();
            const xStep = 4;

            let maxVal = 0;
            Object.keys(_totals).forEach((k) => {
                maxVal = Math.max(maxVal, _totals[k]);
            });

            if (_useNormalLine) {
                _drawNormalLine(maxVal, h, xStep);
            }


            const circles = [];
            Object.keys(_series).forEach((k) => {
                if (!_include(k)) return;
                _ctx.strokeStyle = _colors[k];
                _ctx.beginPath();
                _series[k].forEach((pt, i) => {
                    const yPos = _calcY(h, pt.y, maxVal);
                    const xPos = pt.x * xStep;
                    if (i === 0) {
                        _ctx.moveTo(xPos, yPos);
                    } else {
                        _ctx.lineTo(xPos, yPos);
                    }
                    if (pt.x === _currentX) {
                        circles.push({x: xPos, y: yPos, color: _colors[k], r: 3});
                    }
                });
                _ctx.stroke();

            });

            circles.forEach((circle, i) => {
                _ctx.beginPath();
                _ctx.fillStyle = circle.color;
                _ctx.arc(circle.x, circle.y, circle.r, 0, 2 * Math.PI);
                _ctx.fill();
            });
        };
        //endregion

        //region protected fields and methods (use 'p_' to differentiate).
        this.p_this = function () {
            return _self;
        };
        //endregion

        //region public API
        this.setTotals = function (totals) {
            Object.keys(_totals).forEach((k) => {
                if (!totals[k]) return;
                _totals[k] = totals[k];
            });
            _draw();
        };

        this.setSeries = function (x, values, redraw) {
            Object.keys(_series).forEach((k) => {
                if (!values[k]) return;
                let found = false;
                _series[k].forEach((s, i) => {
                    if (s.x === x) {
                        s.y = values[k];
                        found = true;
                    }
                });
                if (!found) {
                    _series[k].push({x: x, y: values[k]});
                }
                _series[k].sort(function (a, b) {
                    return a.x - b.x;
                });
            });
            if (redraw) {
                _draw();
            }
        };

        this.setCurrentX = function (val) {
            _currentX = val;
            _draw();
        };

        this.setTitle = function (title) {
            _title = title;

        };

        this.normalizeYValues = function (v) {
            _normalizeYValues = v;

        };

        this.filterKeys = function (filterKeys) {
            _filterKeys = filterKeys;

        };

        this.reset = function () {
            _reset();
        };
        //endregion

        _init();
    }
})();