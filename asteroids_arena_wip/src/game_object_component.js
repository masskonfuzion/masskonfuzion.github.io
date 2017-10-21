// NOTE: I might not need this class -- even GameObjectComponents can be GameObjects themselves.  Possibly replace GameObjectComponent with GameObject
function GameObjectComponent() {
    GameObject.call(this);
    this.parentObj = null;
}

GameObjectComponent.prototype = Object.create(GameObject.prototype);
GameObjectComponent.prototype.constructor = GameObjectComponent;


