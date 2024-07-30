import {CollectionInterface} from "../CollectionInterface";
import {ColumnInterface} from "../../column/ColumnInterface";
import {FilterInterface} from "../../filter/FilterInterface";
import {RouteContainer} from "../../routing/RouteContainer";
import {Router} from "../../routing/Router";
import {FilterManager} from "../../filter/FilterManager";
import {ColumnManager} from "../../column/ColumnManager";
import jexl from "jexl";
import * as async from "async";
import {CollectionResourceItem} from "../CollectionResourceItem";
import View from "../../view/View";
import {BatchInterface} from "../../batch/BatchInterface";


export class TableCollection implements CollectionInterface
{
    private abortController: AbortController = null;

    component: string;
    page: number;
    pages: [] = [];
    paginationSteps: number[];
    paginationStep: number;
    paginated: boolean;
    selectedAll: boolean;
    selectedIds: [] = [];
    columns: ColumnInterface[];
    filters: FilterInterface[];
    batches: BatchInterface[];
    routes: RouteContainer;
    loading: boolean = false;
    rows: CollectionResourceItem[];
    count: number;

    constructor(
        private router: Router,
        private filterManager: FilterManager,
        private columnManager: ColumnManager,
        private view: View,
    ) {
    }

    getIds(): Array<number>
    {
        return this.selectedIds;
    }

    init(): void
    {

    }

    async load(): Promise<boolean>
    {
        this.loading = true;

        let parameters = this.routes.getParameters('list');

        if (this.paginated) {
            parameters['page'] = this.page;
            parameters['limit'] = this.paginationStep;
        }

        let data = await this.fetch(parameters);


        this.rows = this.createRowData(data.items);
        this.loading = false;

        if (this.paginated) {
            this.count = parseInt(data.meta.count);
            this.page = parseInt(data.meta.page);
        }

        this.trimPages();
        this.checkSelectedRows();
        this.checkActiveRow();

        return true;
    }

    private async fetch(parameters: object): Promise<any>
    {
        this.loading = true;

        const route = this.routes.getRoute('list');
        if (route === null) {
            throw 'Table collection need a list route';
        }

        const body = {
            filters: this.filterManager.getFilterParameters(this.filters),
            sorting: this.columnManager.getSortingParameters(this.columns),
        }

        if (this.abortController !== null) {
            this.abortController.abort();
        }

        this.abortController = new AbortController();
        const response = await fetch(this.router.generate(route, parameters), {
            method: 'POST',
            body: JSON.stringify(body),
            signal: this.abortController.signal,
        });
        this.abortController = null;

        return await response.json();
    }

    private createRowData(objects: object[]): CollectionResourceItem[]
    {
        let rows = [];
        for (let row of objects) {
            let item = new CollectionResourceItem();
            Object.assign(item, row);
            rows.push(item);
        }
        return rows;
    }

    public selectAll()
    {

    }

    private checkColumnCondition(column: ColumnInterface): boolean
    {
        let context = {
            mobile: window.innerWidth <= 360,
            tablet: window.innerWidth > 360 && window.innerWidth <= 768,
            desktop: window.innerWidth > 768,
            width: window.innerWidth,
            this: column
        };
        if (column.condition) {
            return jexl.evalSync(column.condition, context);
        }
        return true;
    }

    private checkColumnConditions()
    {
        for(let column of this.columns) {
            column.display = this.checkColumnCondition(column);
        }
    }

    public resize()
    {
        this.checkColumnConditions();
    }

    private activateRow(row: CollectionResourceItem)
    {
        return new Promise((resolve, reject) => {
            for(let currentRow of this.rows) {
                currentRow.active = currentRow.id === row.id;
            }

            async.parallel([(callback: (err: any) => void) => {
                this.view.storeValue('active-view', null).then(() => {
                    callback(null);
                }).catch(() => {
                    callback(true);
                });
            },(callback: (err: any) => void) => {
                this.view.storeValue('active-row', row.id).then(() => {
                    callback(null);
                }).catch(() => {
                    callback(true);
                });
            }], (err: any) => {
                if(err) {
                    reject();
                } else {
                    resolve();
                }
            });
        });
    }

    private checkSelectedRows()
    {
        for (let currentRow of this.rows) {
            if (this.selectedIds.indexOf(currentRow.id) !== -1) {
                currentRow.selected = true;
            }
        }
    }

    private checkActiveRow()
    {
        this.view.loadValue('active-row', (id) => {
            if(id) {
                for(let currentRow of this.rows) {
                    currentRow.active = currentRow.id === parseInt(id);
                }
            }
        });
    }

    public clearActiveRow()
    {
        this.view.storeValue('active-view', null);
        this.view.storeValue('active-row', null);
        for(let currentRow of this.rows) {
            currentRow.active = false;
        }
    }

    private trimPages(maxLength: number = 5)
    {
        this.pages.length = 0; // empty array but keep reference
        let numberOfPages = Math.ceil(this.count / this.paginationStep);
        for (let i = 1; i <= numberOfPages; i++) {
            this.pages.push(i);
        }

        if (this.pages.length <= maxLength) {
            return;
        }

        let leftTrim = Math.ceil((maxLength - 1) / 2);
        let rightTrim = Math.floor((maxLength - 1) / 2);

        if (this.pages.length - this.page <= rightTrim) {
            let newRightTrim = this.pages.length - this.page;
            leftTrim += rightTrim - newRightTrim;
            rightTrim = newRightTrim;
        } else if (this.page <= leftTrim) {
            let newLeftTrim = this.page - 1;
            rightTrim += leftTrim - newLeftTrim;
            leftTrim = newLeftTrim;
        }


        this.pages.splice(0,  this.pages.indexOf(this.page) - leftTrim);
        let rightTrimIndex = this.pages.indexOf(this.page) + rightTrim + 1;
        this.pages.splice(rightTrimIndex, this.pages.length - rightTrimIndex + 1);
    }

    public changeSelect(row: CollectionResourceItem, value: boolean)
    {
        this.selectedAll = !value ? false : this.selectedAll;

        row.selected = value;

        let index = this.selectedIds.indexOf(row.id);

        // add id if necessary
        if (value && index === -1) {
            this.selectedIds.push(row.id);

            // remove id if necessary
        } else if (false == value && index !== -1) {
            this.selectedIds.splice(index, 1);
        }
    }

    public changeSelectAll(value: boolean)
    {
        this.selectedAll = value;
        this.resetSelectedIds();

        if (this.hasPages()) {
            if (value) {
                this.markAllEntries();
            } else {
                this.markAllRowsWith(false);
            }
        } else {
            if (value) {
                this.markVisibleEntries();
                this.markAllRowsWith(true);
            } else {
                this.markAllRowsWith(false);
            }
        }
    }

    private hasPages()
    {
        return this.pages.length > 1;
    }

    private resetSelectedIds()
    {
        this.selectedIds.splice(0, this.selectedIds.length);
    }

    private hasSelectedIds()
    {
        return this.selectedIds.length > 0;
    }

    private markAllRowsWith(value: boolean)
    {
        for (let row of this.rows) {
            row.selected = value;
        }
    }

    private markVisibleEntries()
    {
        for (let row of this.rows) {
            this.selectedIds.push(row.id);
        }
    }

    private async markAllEntries(): Promise<void>
    {
        this.loading = true;

        let parameters = {
            hydrate: 'id',
            paginated: 0
        };

        let data = await this.fetch(parameters);

        for (let item of data.items) {
            this.selectedIds.push(item.id);
        }

        this.loading = false;
        this.checkSelectedRows();
    }
}
