import Event, {ResolveEvent, RejectEvent} from './Event/Event';
import View from './View';
import * as _ from 'lodash';

export default class EventDispatcher
{
    private subscribers: Subscriber[] = [];
    private dispatchSubscriber: Subscriber[] = [];
    private allSubscriber: Subscriber[] = [];
    private events: EventStore[] = [];
    private view: View;

    constructor(view: View)
    {
        this.view = view;

        this.onDispatch((event: Event) => {
            if(event.origin == null) {
                event.origin = this.view.getId();
            }
            event.history.push(window.location.href);
            if(event.ttl == null) {
                event.ttl = view.isRoot() ? 2 : 3;
            }
        });

        // receive message events
        let regex = new RegExp('^view_stack_event');
        window.addEventListener("message", (event) => {
            let data = event.data;
            if(typeof data == 'string' && regex.test(data)) {
                data = data.substring(17);
                let eventData = JSON.parse(data);
                let newEvent = new Event('');
                _.extend(newEvent, eventData);

                if(this.isDebug()) {
                    console.groupCollapsed('receive event ('+ newEvent.name+') on ' + view.getId());
                    console.dir(newEvent);
                    console.groupEnd();
                }

                this.dispatch(newEvent);
            }
        }, false);

        // send event to parent window
        if(window.parent && !view.isRoot()) {
            this.all(function (event: Event) {
                if(event.origin == view.getId()) {
                    let serializeEvent = 'view_stack_event|'+JSON.stringify(event);
                    window.parent.postMessage(serializeEvent, '*');
                }
            });
        }


        this.on('reject', (event: RejectEvent) => {
            this.events.forEach((eventStore: EventStore) => {
                if(eventStore.event.uuid == event.uuid) {
                    eventStore.reject(event.data);
                    this.removeEvent(eventStore);
                }
            });
        });

        this.on('resolve', (event: ResolveEvent) => {
            this.events.forEach((eventStore: EventStore) => {
                if(eventStore.event.uuid == event.uuid) {
                    eventStore.resolve(event.data);
                    this.removeEvent(eventStore);
                }
            });
        });
    }

    private removeEvent(eventStore: EventStore)
    {
        for(let i in this.events) {
            if(eventStore.event.uuid == this.events[i].event.uuid) {
                this.events.splice(parseInt(i), 1);
                return;
            }
        }
    }

    public dispatch(event: Event): Promise<object>
    {
        this.dispatchSubscriber.forEach((subscriber:Subscriber) => {
            subscriber.callback(event);
        });

        if(event.ttl == 0) {
            return;
        }
        event.ttl--;

        if(this.isDebug()) {
            console.groupCollapsed('dispatch event ('+ event.name+') on ' + this.view.getId());
            console.dir(event);
            console.groupEnd();
        }

        const promise = new Promise((resolve, reject) => {
            if(event.origin == this.view.getId()) {
                if(event.name != 'reject' && event.name != 'resolve') {
                    this.events.push(new EventStore(event, resolve, reject));
                }
            }

            this.subscribers.forEach((subscriber:Subscriber) => {
                if(subscriber.eventName == event.name) {
                    subscriber.callback(event);
                }
            });

            this.allSubscriber.forEach((subscriber:Subscriber) => {
                subscriber.callback(event);
            });
        });
        // set empty function to prevent "Uncaught (in promise)" error
        promise.catch( (data:object) => {});
        return promise;
    }

    public on(eventName: string, callback: (event: Event) => void): Subscriber
    {
        let subscriber = new Subscriber();
        subscriber.eventName = eventName;
        subscriber.callback = callback;
        this.subscribers.push(subscriber);
        return subscriber;
    }

    public all(callback: (event: Event) => void): Subscriber
    {
        let subscriber = new Subscriber();
        subscriber.eventName = null;
        subscriber.callback = callback;
        this.allSubscriber.push(subscriber);
        return subscriber;
    }

    public onDispatch(callback: (event: Event) => void): Subscriber
    {
        let subscriber = new Subscriber();
        subscriber.eventName = null;
        subscriber.callback = callback;
        this.dispatchSubscriber.push(subscriber);
        return subscriber;
    }

    public remove(subscriber: Subscriber)
    {
        this.removeFromArray(subscriber, this.subscribers);
        this.removeFromArray(subscriber, this.dispatchSubscriber);
        this.removeFromArray(subscriber, this.allSubscriber);
    }

    private removeFromArray(subscriber: Subscriber, subscribers: Subscriber[])
    {
        const index = subscribers.indexOf(subscriber);
        if(index >= 0) {
            subscribers.splice(index, 1);
        }
    }

    public isDebug()
    {
        return false;
    }
}


export class Subscriber
{
    eventName: string = null;
    callback: (event: Event) => void;
}

class EventStore
{
    event: Event;
    resolve: (data: object) => void;
    reject: (data: object) => void;

    constructor(event: Event, resolve: (data: object) => void, reject: (data: object) => void)
    {
        this.event = event;
        this.resolve = resolve;
        this.reject = reject;
    }
}