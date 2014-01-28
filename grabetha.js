var EventEmitter = require('events').EventEmitter,
    doc = require('doc-js'),
    interact = require('interact-js');

var droppables = [];

function checkElementLocation(element, position){
    var boundingRect = element.getBoundingClientRect();

    return boundingRect.left < position.x && boundingRect.left + boundingRect.width > position.x &&
        boundingRect.top < position.y && boundingRect.top + boundingRect.height > position.y;
}

function triggerDrop(grabbable, position){
    var droppable,
        targets;
    for(var i = 0; i < droppables.length; i++) {
        droppable = droppables[i];
        targets = doc(droppable.delegate).find(droppable.selector);

        for(var j = 0; j < targets.length; j++) {
            if(checkElementLocation(targets[i], position)){
                droppable._drop(grabbable, targets[i]);
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

function createGhost(element){
    var style = window.getComputedStyle(element),
        ghost = element.cloneNode(true);

    for(var key in style) {
        ghost.style[key] = style[key];
    }

    ghost.style.position = 'absolute';
    ghost.style.opacity = '0.5';
    ghost.style.top = '0';
    ghost.style.left = '0';

    return ghost;
}

function Grab(target, interaction){
    var targetRects = target.getBoundingClientRect();
    this.target = target;

    this.targetOffset = {
        x: targetRects.left - interaction.pageX,
        y: targetRects.top - interaction.pageY
    }

    this._position = {
        x:0,
        y:0
    };
    this.position({
        x: interaction.pageX,
        y: interaction.pageY
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
        target = interaction.getActualTarget();

    if(!doc(target).is(grabbable.selector)){
        return;
    }

    this.target = target;
    this.currentGrab = new Grab(target, interaction);

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
        this.emit('drop', this.currentGrab.position());
        triggerDrop(this, this.currentGrab.position());
    }

    this.target = null;
    this.currentGrab = null;
    this.grabStarted = null;

    return this;
};

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
Droppable.prototype._drop = function(grabbable, target){
    this.emit('drop', {
        grabbable: grabbable,
        target: target
    });
};
Droppable.prototype.destroy = function(){
    var dropableIndex = droppables.indexOf(this);

    droppables.splice(dropableIndex, 1);
};

function droppable(delegate, selector){
    var instance = Object.create(Droppable.prototype);
    Droppable.apply(instance, arguments);

    return instance;
}

module.exports = {
    grabbable: grabbable,
    droppable: droppable,
    createGhost: createGhost
};

