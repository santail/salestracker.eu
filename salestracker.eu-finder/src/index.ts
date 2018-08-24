var start = Date.now();

console.log("starting timer...");
// expected output: starting timer...

setTimeout(function() {
  var millis = Date.now() - start;

  console.log("seconds elapsed = " + Math.floor(millis/1000));
  // expected output : seconds elapsed = 2
}, 2000);