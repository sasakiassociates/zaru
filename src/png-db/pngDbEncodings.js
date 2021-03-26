const pngDbEncodings = () => {
    const MAX_VALUE = 255 * 256 * 256 - 1;
    const rgba = (r, g, b, a) => {
        return {r, g, b, a};
    };
    const valueToEncoded = (field, value) => {
        if (field.range) {
            value = value - field.range.min;//store the offset from the min value for smaller integers and also to allow signed values with the same methodology
        }
        if (field.precision) {
            value = Math.round(value * field.precision);
        } else {
            value = Math.round(value);
        }
        if (value > MAX_VALUE) {
            console.warn(`Maximum value exceeded ${value} (TRUNCATED)`);
            value = MAX_VALUE;
        }
        let encodedValue = 0;
        if (value > 255) {
            let r = 0;
            const b = value % 256;
            let g = Math.floor(value / 256);

            if (g > 255) {
                r = Math.floor(g / 256);
                g = g % 256;
            }
            if (r > 255) {
                console.warn('MAX VALUE VIOLATION: ' + value + ' : ' + MAX_VALUE);
                r = 255;
            }
            return rgba(r, g, b, 255);
        } else {
            return rgba(0, 0, value, 255);
        }
    };
    return {valueToEncoded}
};
