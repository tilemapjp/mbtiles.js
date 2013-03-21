// This is mbtiles.js, a port of SQLite to JavaScript using Emscripten

var MBTiles = (function(){

  var fileCounter = 0;

  MBTiles = function(data) {
    this.apiTemp = _malloc(12);

    this.filename = 'mbtiles_' + fileCounter++;
    if (data) {
      FS.createDataFile('/', this.filename, data, true, true);
    }
    var ret = Module['ccall']('sqlite3_open', 'number', ['string', 'number'], [this.filename, this.apiTemp]);
    if (ret) throw 'SQLite exception: ' + ret;

    this.ptr = getValue(this.apiTemp, 'i32');

    return this;
  };

  MBTiles.open = function(data) {
    return new MBTiles(data);
  };

  MBTiles.prototype.getTileImage = function(column, row, zoom) {
    var returl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAFElEQVR4XgXAAQ0AAABAMP1L30IDCPwC/o5WcS4AAAAASUVORK5CYII=';

    // Statementのprepare
    var ret = Module['ccall']('sqlite3_prepare', 'number',
        ['number', 'string', 'number', 'number', 'number'],
        [this.ptr, 'SELECT tile_data FROM tiles WHERE zoom_level = ?1 AND tile_column = ?2 AND tile_row = ?3', -1, this.apiTemp, this.apiTemp + 4]
    );
    if (ret) throw 'SQLite exception: ' + ret;

    var stmt = getValue(this.apiTemp, 'i32');

    // 検索値のbind
    ret = Module['ccall']( 'sqlite3_bind_int', 'number', ['number', 'number', 'number'], [stmt, 1, zoom] );
    ret = Module['ccall']( 'sqlite3_bind_int', 'number', ['number', 'number', 'number'], [stmt, 2, column] );
    ret = Module['ccall']( 'sqlite3_bind_int', 'number', ['number', 'number', 'number'], [stmt, 3, row] );

    // SQL実行
    ret = Module['ccall']( 'sqlite3_step', 'number', ['number'], [stmt] );

    switch (ret) {
      case 100 :
        // カラム取り出し
        var blobsize = Module['ccall']( 'sqlite3_column_bytes', 'number', ['number', 'number'], [stmt, 0] );
        var blobptr  = Module['ccall']( 'sqlite3_column_blob', 'number', ['number', 'number'], [stmt, 0] );

        var blobview = new Uint8Array(HEAPU8.subarray(blobptr, blobptr + blobsize - 1));
        var blob     = new Blob( [blobview], {type:"image/png"} );
        returl = URL.createObjectURL(blob);

        document.getElementById('img').setAttribute('src',returl);
        break;
      case 101 :
        break;
      default :
    }

    // Statement終了
    ret = Module['ccall']( 'sqlite3_finalize', 'number', ['number'], [stmt] );
    if (ret) throw 'SQLite exception: ' + ret;

    return returl;
  };

  MBTiles.prototype.close = function() {
    // DB接続解放
    Module['ccall']( 'sqlite3_close', 'number', ['number'], [this.ptr] );
    _free(this.apiTemp);
  };

  var Module = {'noInitialRun' : true };
