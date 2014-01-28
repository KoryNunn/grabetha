function logEvent(event){
    console.log(event);
}

var grabetha = require('./grabetha'),
    venfix = require('venfix');

var grabbableStuff = grabetha.grabbable('.things .stuff');

grabbableStuff
    .on('grab', function(grab){
        var startPosition = grab.position(),
            clone = grabetha.createGhost(this.target);

        this.clone = clone;

        document.body.appendChild(clone);

        grab.on('move', function(position){
            // grab.position({
            //     x: position.x,
            //     y: startPosition.y
            // });
            clone.style[venfix('transform')] = 'translate3d(' + (this.targetOffset.x + position.x) + 'px,' + (this.targetOffset.y + position.y) + 'px,0)'
        });
    })
    .on('drop', function(position){
        this.clone.parentNode.removeChild(this.clone);
        this.clone = null
    })


var dropArea = grabetha.droppable('.majigger');

dropArea
    .on('hover', logEvent).on('drop', logEvent);