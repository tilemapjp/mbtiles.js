# Edit for your paths
EMSCRIPTEN=~/emscripten
EMCC=$(EMSCRIPTEN)/emcc -O2
# -s INLINING_LIMIT=0
CFLAGS=-DSQLITE_DISABLE_LFS -DLONGDOUBLE_TYPE=double -DSQLITE_INT64_TYPE="long long int" -DSQLITE_THREADSAFE=0
JS_COMPILER = java -Xmx512M -jar lib/google-compiler/compiler.jar --charset UTF-8

all: mbtiles.js

mbtiles.js: c/sqlite3.c js/post.js js/pre.js
	rm -f js/mbtiles.js
	$(EMCC) $(CFLAGS) c/sqlite3.c --pre-js js/pre.js --post-js js/post.js -o js/mbtiles.js -s EXPORTED_FUNCTIONS="['_sqlite3_open', '_sqlite3_close', '_sqlite3_exec', '_sqlite3_prepare', '_sqlite3_bind_int', '_sqlite3_step', '_sqlite3_column_bytes', '_sqlite3_column_blob', '_sqlite3_column_text', '_sqlite3_column_int', '_sqlite3_finalize', '_sqlite3_errmsg', '_sqlite3_reset']"

#min.js: js/mbtiles.js
#	rm -f js/mbtiles.min.js
#	$(JS_COMPILER) --js js/mbtiles.js >> js/mbtiles.min.js

#benchmark.html: sqlite3.c benchmark.c
#	$(EMCC) $(CFLAGS) sqlite3.c benchmark.c -o ../test/benchmark.html

#benchmark: benchmark.c
#	gcc $(CFLAGS) -pthread -O2 sqlite3.c benchmark.c -o ../test/benchmark

clean:
	rm js/mbtiles.js js/mbtiles.min.js #../test/benchmark.html ../test/benchmark.js
