var EventEmitter = require('events').EventEmitter,
    doc = require('doc-js'),
    predator = require('predator'),
    venfix = require('venfix'),
    interact = require('interact-js');

// grabitha needs to share droppables between instances.
var droppables = window._grabithaDroppables = window._grabithaDroppables || [];

function checkElementLocation(element, position){
    var boundingRect = predator(element);

    return boundingRect.left < position.x && boundingRect.left + boundingRect.width > position.x &&
        boundingRect.top < position.y && boundingRect.top + boundingRect.height > position.y;
}

function emitDroppableEvent(event, grabbable, position){
    var droppable,
        targets;
    for(var i = 0; i < droppables.length; i++) {
        droppable = droppables[i];
        targets;

        if(typeof droppable.selector === 'string'){
            targets = doc(droppable.delegate).find(droppable.selector);
        }else{
            if(doc(droppable.selector).closest(droppable.delegate)){
                targets = [droppable.selector];
            }
        }

        for(var j = 0; j < targets.length; j++) {
            if(checkElementLocation(targets[j], position)){
                droppable._emit(event, {
                    target: targets[j],
                    grabbable: grabbable,
                    position: position
                });
            }
        }
    }
}

function getterSetter(get, set){
    return function(){
        if(arguments.length === 0){
            return get.call(this);
        }else{
            set.apply(this, arguments);
        }
    };
}

function Grab(grabbable, target, interaction){
    var targetRects = target.getBoundingClientRect();
    this.target = target;
    this.grabbable = grabbable;
    this.interaction = interaction;

    this.targetOffset = {
        x: targetRects.left - (interaction.pageX - window.scrollX),
        y: targetRects.top - (interaction.pageY - window.scrollY)
    }

    console.log(this.targetOffset);

    this._position = {
        x:0,
        y:0
    };
    this.position({
        x: interaction.pageX - window.scrollX,
        y: interaction.pageY - window.scrollY
    });
}
Grab.prototype = Object.create(EventEmitter.prototype);
Grab.prototype.constructor = Grab;
Grab.prototype.position = getterSetter(
    function(){
        return {
            x: this._position.x,
            y: this._position.y
        };
    },
    function(position){
        this._position.x = position.x;
        this._position.y = position.y;
        emitDroppableEvent('hover', this.grabbable, this.position());
        this.emit('move', this.position());
    }
);

function Grabbable(delegate, selector){
    if(arguments.length < 2){
        selector = delegate;
        delegate = document;
    }

    this.delegate = delegate;
    this.selector = selector;

    doc.ready(this.init.bind(this));
}
Grabbable.prototype = Object.create(EventEmitter.prototype);
Grabbable.prototype.constructor = Grabbable;
Grabbable.prototype.init = function(){
    this.delegate = doc(this.delegate)[0];

    if(!this.delegate){
        return;
    }

    interact.on('start', this.delegate, this._start.bind(this));
    interact.on('drag', this.delegate, this._drag.bind(this));
    interact.on('end', this.delegate, this._end.bind(this));
    interact.on('cancel', this.delegate, this._end.bind(this));
};
Grabbable.prototype._start = function(interaction){
    var grabbable = this,
        target = doc(interaction.target).closest(grabbable.selector);

    if(!target){
        return;
    }

    interaction.stopPropagation();
    interaction.preventDefault();

    this.target = target;
    this.currentGrab = new Grab(this, target, interaction);

    return this;
};
Grabbable.prototype._drag = function(interaction){
    var grabbable = this,
        target = this.target;

    if(!target){
        return;
    }

    if(!this.grabStarted){
        this.emit('grab', this.currentGrab);
        this.grabStarted = true;
    }

    interaction.stopPropagation();
    interaction.preventDefault();

    var moveDelta = interaction.getMoveDelta(),
        oldPosition = this.currentGrab.position();

    this.currentGrab.position({
        x: oldPosition.x + moveDelta.x,
        y: oldPosition.y + moveDelta.y
    });

    return this;
};
Grabbable.prototype._end = function(interaction){
    var grabbable = this,
        target = this.target;

    if(!target){
        return;
    }

    if(this.grabStarted){
        emitDroppableEvent('drop', this, this.currentGrab.position());
        this.emit('drop', this.currentGrab.position());
    }

    delete this.target;
    delete this.currentGrab;
    delete this.grabStarted;

    return this;
}
Grabbable.prototype.createGhost = function(element){
    element = element || this.target;
    var ghost = element.cloneNode(true),
        grab = this.currentGrab;

    ghost.style.cssText = document.defaultView.getComputedStyle(element, '').cssText;

    ghost.style.position = 'absolute';
    ghost.style.opacity = '0.5';
    ghost.style.top = '0';
    ghost.style.left = '0';

    grab.on('move', function(position){
        ghost.style[venfix('transform')] = 'translate3d(' + (grab.targetOffset.x + position.x + window.scrollX) + 'px,' + (grab.targetOffset.y + position.y + window.scrollY) + 'px,0)'
    });

    ghost.destroy = function(){
        ghost.parentNode.removeChild(ghost);
    };

    document.body.appendChild(ghost);

    return ghost;
}

function grabbable(delegate, selector){
    var instance = Object.create(Grabbable.prototype);
    Grabbable.apply(instance, arguments);

    return instance;
}


function Droppable(delegate, selector){
    droppables.push(this);

    if(arguments.length < 2){
        selector = delegate;
        delegate = document;
    }

    this.delegate = delegate;
    this.selector = selector;

    doc.ready(this.init.bind(this));
}
Droppable.prototype = Object.create(EventEmitter.prototype);
Droppable.prototype.constructor = Droppable;
Droppable.prototype.init = function(){
    this.delegate = doc(this.delegate)[0];

    if(!this.delegate){
        return;
    }
};
Droppable.prototype.destroy = function(){
    var dropableIndex = droppables.indexOf(this);

    droppables.splice(dropableIndex, 1);
};
Droppable.prototype._emit = function(event, details){

    this.emit(event, details);
};

function droppable(delegate, selector){
    var instance = Object.create(Droppable.prototype);
    Droppable.apply(instance, arguments);

    return instance;
}

module.exports.grabbable = grabbable;
module.exports.droppable = droppable;