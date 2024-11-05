import {Router} from "@enhavo/app/routing/Router";
import {ActionManager} from "@enhavo/app/action/ActionManager";
import {ActionInterface} from "@enhavo/app/action/ActionInterface";
import {FrameManager} from "@enhavo/app/frame/FrameManager";
import {PreviewData} from "@enhavo/app/action/model/PreviewAction";

export class ResourcePreviewManager
{
    public frameClass: string;
    public previewData :string;
    public iframe: HTMLIFrameElement;

    public actions: ActionInterface[];
    public actionsSecondary: ActionInterface[];

    constructor(
        private actionManager: ActionManager,
        private frameManager: FrameManager,
    ) {
    }

    async load(url: string)
    {
        const response = await fetch(url);
        const data = await response.json();

        this.actions = this.actionManager.createActions(data.actions);
        this.actionsSecondary = this.actionManager.createActions(data.actionsSecondary);

        this.subscribe();

        this.frameManager.loaded();
    }

    loadDefaults()
    {
        this.actions = this.actionManager.createActions([
            {
                key: 'desktop',
                label: 'Desktop',
                icon: 'desktop_windows',
                model: 'PreviewModeAction',
                component: 'action-action',
                frameClass: 'desktop'
            },
            {
                key: 'mobile',
                label: 'Mobile',
                icon: 'phone_iphone',
                model: 'PreviewModeAction',
                component: 'action-action',
                frameClass: 'mobile'
            },
            {
                key: 'tablet',
                label: 'Tablet',
                icon: 'tablet_mac',
                model: 'PreviewModeAction',
                component: 'action-action',
                frameClass: 'tablet'
            },
        ]);

        this.subscribe();

        this.actionsSecondary = [];
        this.frameManager.loaded();
    }

    private subscribe()
    {
        this.frameManager.on('preview-data', (event) => {
            if ((event as PreviewData).target == this.frameManager.getId()) {
                this.previewData = (event as PreviewData).data;
                if (this.iframe) {
                    this.iframe.contentWindow.document.open();
                    this.iframe.contentWindow.document.write(this.previewData);
                    this.iframe.contentWindow.document.close();
                }

                event.resolve();
            }
        })
    }
}