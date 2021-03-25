import * as $ from "jquery";
import AbstractAction from "@enhavo/app/action/model/AbstractAction";
import LoadingEvent from "@enhavo/app/view-stack/Event/LoadingEvent";
import View from "@enhavo/app/view/View";
import EventDispatcher from "@enhavo/app/view-stack/EventDispatcher";

export default class SaveAction extends AbstractAction
{
    public url: string;

    private readonly view: View;
    private readonly eventDispatcher: EventDispatcher;

    constructor(view: View, eventDispatcher: EventDispatcher) {
        super();
        this.view = view;
        this.eventDispatcher = eventDispatcher;
    }

    execute(): void
    {
        let event = new LoadingEvent(this.view.getId());
        this.eventDispatcher.dispatch(event);

        let $form = $('form');

        if (this.url) {
            $form.attr('action', this.url);
        }

        $form.submit();
    }
}
