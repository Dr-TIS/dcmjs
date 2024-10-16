/**
 * Converts input into a binary/latin1-encoded array
 * @param {*} str
 * @return {Number[]}
 */
function toBinaryArray(str) {
    if (typeof str === "number") {
        // somehow numbers are passed into here from the reader
        str = str.toString();
    }
    if (typeof str !== "string") {
        // just in case there are other non-strings passed in
        return [];
    }
    return str.split("").map(char => char.charCodeAt(0)); // split and map to char code
}

function toInt(val) {
    if (isNaN(val)) {
        throw new Error("Not a number: " + val);
    } else if (typeof val == "string") {
        return parseInt(val);
    } else return val;
}

function toFloat(val) {
    if (isNaN(val)) {
        throw new Error("Not a number: " + val);
    } else if (typeof val == "string") {
        return parseFloat(val);
    } else return val;
}

class BufferStream {
    constructor(sizeOrBuffer, littleEndian) {
        this.buffer =
            typeof sizeOrBuffer == "number"
                ? new ArrayBuffer(sizeOrBuffer)
                : sizeOrBuffer;
        if (!this.buffer) {
            this.buffer = new ArrayBuffer(0);
        }
        this.view = new DataView(this.buffer);
        this.offset = 0;
        this.isLittleEndian = littleEndian || false;
        this.size = 0;
    }

    setEndian(isLittle) {
        this.isLittleEndian = isLittle;
    }

    writeUint8(value) {
        this.checkSize(1);
        this.view.setUint8(this.offset, toInt(value));
        return this.increment(1);
    }

    writeInt8(value) {
        this.checkSize(1);
        this.view.setInt8(this.offset, toInt(value));
        return this.increment(1);
    }

    writeUint16(value) {
        this.checkSize(2);
        this.view.setUint16(this.offset, toInt(value), this.isLittleEndian);
        return this.increment(2);
    }

    writeTwoUint16s(value) {
        this.checkSize(4);
        const first = value >> 16;
        const second = value & 0xffff;
        this.view.setUint16(this.offset, toInt(first), this.isLittleEndian);
        this.view.setUint16(
            this.offset + 2,
            toInt(second),
            this.isLittleEndian
        );
        return this.increment(4);
    }

    writeInt16(value) {
        this.checkSize(2);
        this.view.setInt16(this.offset, toInt(value), this.isLittleEndian);
        return this.increment(2);
    }

    writeUint32(value) {
        this.checkSize(4);
        this.view.setUint32(this.offset, toInt(value), this.isLittleEndian);
        return this.increment(4);
    }

    writeInt32(value) {
        this.checkSize(4);
        this.view.setInt32(this.offset, toInt(value), this.isLittleEndian);
        return this.increment(4);
    }

    writeFloat(value) {
        this.checkSize(4);
        this.view.setFloat32(this.offset, toFloat(value), this.isLittleEndian);
        return this.increment(4);
    }

    writeDouble(value) {
        this.checkSize(8);
        this.view.setFloat64(this.offset, toFloat(value), this.isLittleEndian);
        return this.increment(8);
    }

    writeString(value) {
        value = value || "";
        var bin = toBinaryArray(value),
            bytelen = bin.length;

        this.checkSize(bytelen);
        var startOffset = this.offset;
        for (var i = 0; i < bytelen; i++) {
            this.view.setUint8(startOffset, bin[i]);
            startOffset++;
        }
        return this.increment(bytelen);
    }

    writeHex(value) {
        var len = value.length,
            blen = len / 2,
            startOffset = this.offset;
        this.checkSize(blen);
        for (var i = 0; i < len; i += 2) {
            var code = parseInt(value[i], 16),
                nextCode;
            if (i == len - 1) {
                nextCode = null;
            } else {
                nextCode = parseInt(value[i + 1], 16);
            }
            if (nextCode !== null) {
                code = (code << 4) | nextCode;
            }
            this.view.setUint8(startOffset, code);
            startOffset++;
        }
        return this.increment(blen);
    }

    readUint32() {
        var val = this.view.getUint32(this.offset, this.isLittleEndian);
        this.increment(4);
        return val;
    }

    readUint16() {
        var val = this.view.getUint16(this.offset, this.isLittleEndian);
        this.increment(2);
        return val;
    }

    readUint8() {
        var val = this.view.getUint8(this.offset);
        this.increment(1);
        return val;
    }

    readUint8Array(length) {
        var arr = new Uint8Array(this.buffer, this.offset, length);
        this.increment(length);
        return arr;
    }

    readUint16Array(length) {
        var sixlen = length / 2,
            arr = new Uint16Array(sixlen),
            i = 0;
        while (i++ < sixlen) {
            arr[i] = this.view.getUint16(this.offset, this.isLittleEndian);
            this.offset += 2;
        }
        return arr;
    }

    readInt16() {
        var val = this.view.getInt16(this.offset, this.isLittleEndian);
        this.increment(2);
        return val;
    }

    readInt32() {
        var val = this.view.getInt32(this.offset, this.isLittleEndian);
        this.increment(4);
        return val;
    }

    readFloat() {
        var val = this.view.getFloat32(this.offset, this.isLittleEndian);
        this.increment(4);
        return val;
    }

    readDouble() {
        var val = this.view.getFloat64(this.offset, this.isLittleEndian);
        this.increment(8);
        return val;
    }

    readString(length) {
        var string = "";

        var numOfMulti = length,
            index = 0;
        while (index++ < numOfMulti) {
            var charCode = this.readUint8();
            string += String.fromCharCode(charCode);
        }

        return string;
    }

    readHex(length) {
        var hexString = "";
        for (var i = 0; i < length; i++) {
            hexString += this.readUint8().toString(16);
        }
        return hexString;
    }

    checkSize(step) {
        if (this.offset + step > this.buffer.byteLength) {
            //throw new Error("Writing exceeded the size of buffer");
            //resize
            var dstSize = this.offset + step;
            var dst = new ArrayBuffer(dstSize);
            new Uint8Array(dst).set(new Uint8Array(this.buffer));
            this.buffer = dst;
            this.view = new DataView(this.buffer);
        }
    }

    concat(stream) {
        var available = this.buffer.byteLength - this.offset;
        if (stream.size > available) {
            let newbuf = new ArrayBuffer(this.offset + stream.size);
            let int8 = new Uint8Array(newbuf);
            int8.set(new Uint8Array(this.getBuffer(0, this.offset)));
            int8.set(
                new Uint8Array(stream.getBuffer(0, stream.size)),
                this.offset
            );
            this.buffer = newbuf;
            this.view = new DataView(this.buffer);
        } else {
            let int8 = new Uint8Array(this.buffer);
            int8.set(
                new Uint8Array(stream.getBuffer(0, stream.size)),
                this.offset
            );
        }
        this.offset += stream.size;
        this.size = this.offset;
        return this.buffer.byteLength;
    }




    increment(step) {
        this.offset += step;
        if (this.offset > this.size) {
            this.size = this.offset;
        }
        return step;
    }

    getBuffer(start, end) {
        if (!start && !end) {
            start = 0;
            end = this.size;
        }

        return this.buffer.slice(start, end);
    }

    more(length) {
        if (this.offset + length > this.buffer.byteLength) {
            throw new Error("Request more than currently allocated buffer");
        }

        var newBuf = this.buffer.slice(this.offset, this.offset + length);
        this.increment(length);
        return new ReadBufferStream(newBuf);
    }

    reset() {
        this.offset = 0;
        return this;
    }

    end() {
        return this.offset >= this.buffer.byteLength;
    }

    toEnd() {
        this.offset = this.buffer.byteLength;
    }
}

class ReadBufferStream extends BufferStream {
    constructor(buffer, littleEndian) {
        super(buffer, littleEndian);
        this.size = this.buffer.byteLength;
    }
}

class WriteBufferStream extends BufferStream {
    constructor(buffer, littleEndian) {
        super(buffer, littleEndian);
        this.size = 0;
    }
}

export { ReadBufferStream };
export { WriteBufferStream };
