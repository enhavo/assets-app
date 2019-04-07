import MainApp from "@enhavo/app/Main/MainApp";
import MainComponent from "@enhavo/app/Main/Components/MainComponent.vue";
import AbstractApplication from "@enhavo/app/AbstractApplication";
import AppInterface from "@enhavo/app/AppInterface";
import {VueConstructor} from "vue";
import ViewStack from "@enhavo/app/ViewStack/ViewStack";
import MenuManager from "@enhavo/app/Menu/MenuManager";

export class MainApplication extends AbstractApplication
{
    protected viewStack: ViewStack;
    protected menuManager: MenuManager;

    public getApp(): AppInterface
    {
        if(this.app == null) {
            this.app = new MainApp(this.getDataLoader(), this.getViewStack());
        }
        return this.app;
    }

    public getAppComponent(): VueConstructor
    {
        return MainComponent;
    }

    public getViewStack()
    {
        if(this.viewStack == null) {
            this.viewStack = new ViewStack(this.getDataLoader().load().view_stack, this.getMenuManager());
        }
        return this.viewStack;
    }

    public getMenuManager()
    {
        if(this.menuManager == null) {
            this.menuManager = new MenuManager(this.getDataLoader().load().menu);
        }
        return this.menuManager;
    }
}


let application = new MainApplication();
export default application;