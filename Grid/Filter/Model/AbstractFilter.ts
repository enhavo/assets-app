import ApplicationInterface from "@enhavo/app/ApplicationInterface";
import FilterInterface from "@enhavo/app/Grid/Filter/FilterInterface";

export default abstract class AbstractFilter implements FilterInterface
{
    protected application: ApplicationInterface;
    component: string;
    value: string;
    key: string;

    constructor(application: ApplicationInterface)
    {
        this.application = application;
    }

    getValue() {
        return this.value;
    };

    getKey() {
        return this.key;
    };
}