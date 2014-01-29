function logEvent(event){
    console.log(event);
}

var grabetha = require('./grabetha');

var grabbableStuff = grabetha.grabbable('.things .stuff')
    .on('grab', function(grab){
        var startPosition = grab.position(),
            ghost = this.createGhost();

        this.ghost = ghost;
    })
    .on('drop', function(position){
        this.ghost.destroy();
        this.ghost = null
    });


var dropArea = grabetha.droppable('.majigger')
    .on('hover', function(details){
        if(details.grabbable === grabbableStuff){
            console.log('grabbable stuff');
        }else{
            console.log('other stuff');
        }
    })
    .on('drop', logEvent);

var elm = document.createElement('div');
elm.textContent = 'Bla';

grabetha.grabbable(elm).on('grab', function(){
    this.ghost = this.createGhost();
}).on('drop', function(){
    this.ghost.destroy();
});

window.onload = function(){

    document.body.appendChild(elm);

};