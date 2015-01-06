var EventEmitter = require('events').EventEmitter,
    doc = require('doc-js'),
    predator = require('predator'),
    venfix = require('venfix'),
    interact = require('interact-js'),
    translate = require('css-translate'),
    cloneWithStyles = require('clone-with-styles'),
    droppables = [];

// grabetha needs to share droppables between instances.
if(typeof window !== 'undefined'){
    droppables = window._grabethaDroppables = window._grabethaDroppables || droppables;
}

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
            targets = doc(droppable.selector);
        }else{
            targets = [droppable.selector];
        }

        if(!targets){
            continue;
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

var inited,
    grabbables = [];

function initEvents(grabbable){
    grabbables.push(grabbable);

    if(inited){
        return;
    }
    inited = true;

    function dragHandler(interaction){
        if(interaction._noGrabs){
            return;
        }
        if(interaction._grabHandler){
            interaction._grabHandler._drag(interaction);
            return;
        }

        var handlers = [];

        for(var i = 0; i < grabbables.length && !interaction._grabHandler; i++){
            var handler = grabbables[i]._getGrabTarget(interaction);
            if(handler){
                handlers.push(handler);
            }
        }

        var handler = handlers.sort(function(handler1, handler2){
            return doc(handler1.target).closest(handler2.target) ? 1 : -1;
        }).pop();

        if(!handler){
            interaction._noGrabs = true;
            return;
        }

        interaction._grabHandler = handler;
        handler.currentGrab = new Grab(handler, handler.target, interaction);
        handler.emit('grab', handler.currentGrab);
    }
    function endHandler(interaction){
        if(interaction._grabHandler){
            interaction._grabHandler._end(interaction);
        }
        interaction._noGrabs = false;
    }

    interact.on('drag', document, dragHandler);
    interact.on('end', document, endHandler);
    interact.on('cancel', document, endHandler);    
}

function Grabbable(selector){
    this.selector = selector;

    doc.ready(this.init.bind(this));
}
Grabbable.prototype = Object.create(EventEmitter.prototype);
Grabbable.prototype.constructor = Grabbable;
Grabbable.prototype.init = function(){
    initEvents(this);
};
Grabbable.prototype._getGrabTarget = function(interaction){
    this.target = doc(interaction.target).closest(this.selector);

    if(!this.target){
        return;
    }

    return this;
};
Grabbable.prototype._drag = function(interaction){
    var grabbable = this,
        target = this.target;

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

    delete this._grabethaInvalid;

    if(!target){
        return;
    }

    emitDroppableEvent('drop', this, this.currentGrab.position());
    this.emit('drop', this.currentGrab.position());

    delete this.target;
    delete this.currentGrab;

    return this;
};
Grabbable.prototype.createGhost = function(element){
    element = element || this.target;
    var ghost = cloneWithStyles(element),
        grab = this.currentGrab;

    ghost.style.position = 'fixed';
    ghost.style.opacity = '0.5';
    ghost.style.top = '0';
    ghost.style.left = '0';

    grab.on('move', function(position){
        ghost.style[venfix('transform')] = translate('3d',  grab.targetOffset.x + position.x + window.scrollX, grab.targetOffset.y + position.y + window.scrollY, 0);
    });

    ghost.destroy = function(){
        ghost.parentNode.removeChild(ghost);
    };

    document.body.appendChild(ghost);

    return ghost;
};
Grabbable.prototype.destroy = function(){
    var grabbableIndex = grabbables.indexOf(this);

    grabbables.splice(grabbableIndex, 1);
};

function grabbable(selector){
    var instance = Object.create(Grabbable.prototype);
    Grabbable.apply(instance, arguments);

    return instance;
}


function Droppable(selector){
    droppables.push(this);

    this.selector = selector;

    doc.ready(this.init.bind(this));
}
Droppable.prototype = Object.create(EventEmitter.prototype);
Droppable.prototype.constructor = Droppable;
Droppable.prototype.init = function(){

};
Droppable.prototype.destroy = function(){
    var dropableIndex = droppables.indexOf(this);

    droppables.splice(dropableIndex, 1);
};
Droppable.prototype._emit = function(event, details){
    this.emit(event, details);
};

function droppable(selector){
    var instance = Object.create(Droppable.prototype);
    Droppable.apply(instance, arguments);

    return instance;
}

module.exports.grabbable = grabbable;
module.exports.droppable = droppable;