// This is mbtiles.js, a port of SQLite to JavaScript using Emscripten

var MBTiles = (function(){

  var fileCounter = 0;

  MBTiles = function() {
    this.loaded   = false;
    this._metadata = {};
    return this;
  };

  MBTiles.open = function(data) {
    var me = new MBTiles();
    return me._open(data);
  };

  MBTiles.load = function(url, success, fail) {
    var me = new MBTiles();
    me.filename = url.match(".+/(.+?)$")[1];

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function(e) {
      if (this.status == 200) {
        me._open(new Uint8Array(this.response));
        //mbt.getTileImage(3531, 2442, 12);
        //mbt.close();
        if (success) {
          success(me);
        }
      } else {
        if (fail) {
          fail(me, this.status);
        }
      }
    };
    xhr.send();

    return me;
  };

  MBTiles.prototype._open = function(data) {
    this.apiTemp = _malloc(12);

    // DBのopen

    if (!this.filename) {
      this.filename = 'mbtiles_' + fileCounter++;
    }
    if (data) {
      FS.createDataFile('/', this.filename, data, true, true);
    }
    var ret = Module.ccall('sqlite3_open', 'number', ['string', 'number'], [this.filename, this.apiTemp]);
    if (ret) throw 'SQLite exception: ' + ret;

    this.ptr = getValue(this.apiTemp, 'i32');

    // Statementのprepare
    ret = Module.ccall('sqlite3_prepare', 'number',
        ['number', 'string', 'number', 'number', 'number'],
        [this.ptr, 'SELECT tile_data FROM tiles WHERE zoom_level = ?1 AND tile_column = ?2 AND tile_row = ?3', -1, this.apiTemp, this.apiTemp + 4]
    );
    if (ret) throw 'SQLite exception: ' + ret;

    this.tileStmt = getValue(this.apiTemp, 'i32');

    this._setMetaData();

    this.loaded = true;

    return this;
  };

  MBTiles.prototype._setMetaData = function() {
    //metadata テーブルの有無の確認
    var ret = Module.ccall('sqlite3_prepare', 'number',
        ['number', 'string', 'number', 'number', 'number'],
        [this.ptr, "select count(*) from sqlite_master where type='table' and name='metadata';", -1, this.apiTemp, this.apiTemp + 4]
    );
    if (ret) throw 'SQLite exception: ' + ret;
    var mtckStmt = getValue(this.apiTemp, 'i32');
    // SQL実行
    ret = Module.ccall( 'sqlite3_step', 'number', ['number'], [mtckStmt] );
    var exists = Module.ccall( 'sqlite3_column_int', 'number', ['number', 'number'], [mtckStmt, 0] );

    // Statement終了
    ret = Module.ccall( 'sqlite3_finalize', 'number', ['number'], [mtckStmt] );
    if (ret) throw 'SQLite exception: ' + ret;
    
    if (!exists) return;

    //metadata テーブルのスキャン
    ret = Module.ccall('sqlite3_prepare', 'number',
        ['number', 'string', 'number', 'number', 'number'],
        [this.ptr, "select name, value from metadata;", -1, this.apiTemp, this.apiTemp + 4]
    );
    if (ret) throw 'SQLite exception: ' + ret;
    var metaStmt = getValue(this.apiTemp, 'i32');
    while(1) {
      // SQL実行
      ret = Module.ccall( 'sqlite3_step', 'number', ['number'], [metaStmt] );
      var loopEnd = false;
      switch (ret) {
        case 100 :
          // カラム取り出し
          var keysize = Module.ccall( 'sqlite3_column_bytes', 'number', ['number', 'number'], [metaStmt, 0] );
          var keyptr  = Module.ccall( 'sqlite3_column_blob',  'number', ['number', 'number'], [metaStmt, 0] );
          var key     = String.fromCharCode.apply(null, new Uint16Array(HEAPU8.subarray(keyptr, keyptr + keysize)));
          var valsize = Module.ccall( 'sqlite3_column_bytes', 'number', ['number', 'number'], [metaStmt, 1] );
          var valptr  = Module.ccall( 'sqlite3_column_blob',  'number', ['number', 'number'], [metaStmt, 1] );
          var val     = String.fromCharCode.apply(null, new Uint16Array(HEAPU8.subarray(valptr, valptr + valsize)));

          this._metadata[key] = val;
          break;
        case 101 :
          loopEnd = true;
          break;
        default :
          loopEnd = true;
          break;
      }
      if (loopEnd) { break; }
    }
    // Statement終了
    ret = Module.ccall( 'sqlite3_finalize', 'number', ['number'], [metaStmt] );
    if (ret) throw 'SQLite exception: ' + ret;
  };

  MBTiles.prototype.metadata = function(key) {
    return this._metadata[key];
  };

  MBTiles.prototype.getTileImage = function(column, row, zoom) {
    var returl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAFElEQVR4XgXAAQ0AAABAMP1L30IDCPwC/o5WcS4AAAAASUVORK5CYII=';

    // Stmtのリセット
    var ret = Module.ccall( 'sqlite3_reset', 'number', ['number'], [this.tileStmt] );

    // 検索値のbind
    ret = Module.ccall( 'sqlite3_bind_int', 'number', ['number', 'number', 'number'], [this.tileStmt, 1, zoom] );
    ret = Module.ccall( 'sqlite3_bind_int', 'number', ['number', 'number', 'number'], [this.tileStmt, 2, column] );
    ret = Module.ccall( 'sqlite3_bind_int', 'number', ['number', 'number', 'number'], [this.tileStmt, 3, row] );

    // SQL実行
    ret = Module.ccall( 'sqlite3_step', 'number', ['number'], [this.tileStmt] );

    switch (ret) {
      case 100 :
        // カラム取り出し
        var blobsize = Module.ccall( 'sqlite3_column_bytes', 'number', ['number', 'number'], [this.tileStmt, 0] );
        var blobptr  = Module.ccall( 'sqlite3_column_blob',  'number', ['number', 'number'], [this.tileStmt, 0] );

        var blobview = new Uint8Array(HEAPU8.subarray(blobptr, blobptr + blobsize));
        var blob     = new Blob( [blobview], {type:"image/png"} );
        returl = URL.createObjectURL(blob);

        break;
      case 101 :
        break;
      default :
    }

    return returl;
  };

  MBTiles.prototype.close = function() {
    // Statement終了
    var ret = Module.ccall( 'sqlite3_finalize', 'number', ['number'], [this.tileStmt] );
    if (ret) throw 'SQLite exception: ' + ret;

    // DB接続解放
    Module.ccall( 'sqlite3_close', 'number', ['number'], [this.ptr] );
    _free(this.apiTemp);

    this.loaded = false;
  };

  var Module = {'noInitialRun' : true };
