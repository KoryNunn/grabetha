grabetha
========

## What

Grabetha is a fairly raw grab and drop library to help solve the grabbing and dropping of UI's that are based on data.

That said, a UI does not need to be data-driven for grabetha to work.

Usage:

    npm install grabetha.

Require grabetha:

  var grabetha = require('./grabetha');

Create a grabbable set:

### grabetha.grabbable(element or selector)

  var grabbableStuff = grabetha.grabbable('.things .stuff');

Assign handlers to the set:


    grabbableStuff.on('grab', function(grab){
        // 'grab' gets raised once when a grabbable item is grabbed.

        // you can put stuff on the grabbableStuff object that is passed in,
        // as it lives throughout the lifecycle of the interaction.
        // the grabbableStuff object is also passed to any droppable instances
        // that it is hovered over or dropped onto.

        // Use the ghost helper to easily create
        // a ghost version of the thing you are grabbing.
        this.ghost = this.createGhost();

        // Listen to move events
        grab.on('move', function(){
            // a 'move' is raised every mousemove or touchmove

            //Do something
        });

    })
    // Listen to the drop
    .on('drop', function(position){
        // a drop is raised on mouseup or touchend

        // Cleanup the ghost.
        this.ghost.destroy();
        this.ghost = null
    });

Create a droppable set:

### grabetha.droppable(element or selector)

    var dropArea = grabetha.droppable('.majigger');

Assign handlers

    dropArea.on('hover', function(event){
        // the droppable element it is over
        event.taget;

        // the grabbale instance that is over it.
        event.grabbable;

        // the location of the grab
        event.position;
    })
    .on('drop', function(event){
        // the same stuff as above is accessable here.
        console.log(event);
    });
