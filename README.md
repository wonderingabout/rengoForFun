# rengoForFun
a:

- vanillaJS powered board engine
- vanillaJS front-end,
- node.js back-end
- mySQL database rengo server !

# Progress Status

(unfinished) : Making it work on console (command-line) for now !

supported (for now):

- environment: web browser only
- rules: chinese rules only
- clocks (autodetected): 
```
* byoyomi (periods >= 1 && (maintime > 0 || periodtime > 0)),
* simple (periods === 1 && maintime === 0 && periodtime > 0),
* absolute (periods === 0 && maintime > 0 && periodtime === 0)
```
