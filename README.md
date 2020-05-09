# rengoForFun

Playing go on a V8 engine!

## Progress Status

(unfinished) : Making it work on console (command-line) for now!

supported (for now):

- environment: V8-capable web browser
- rules: chinese rules only
- clocks (autodetected):

```Text
byoyomi:  (periods >= 1  AND (maintime > 0 or periodtime > 0)),
simple:   (periods === 1 AND (maintime === 0 and periodtime > 0),
absolute: (periods === 0 AND (maintime > 0 and periodtime === 0)
```
