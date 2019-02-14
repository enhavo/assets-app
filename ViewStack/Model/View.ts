import ViewInterface from "../ViewInterface";

export default class View implements ViewInterface
{
    id: number;
    label: string;
    children: ViewInterface[] = [];
    parent: ViewInterface = null;
    component: string;
    priority: number = 0;
    width: number = 0;
    loaded: boolean = false;
    minimize: boolean = false;

    finish(): void {
        this.loaded = true;
    }
}