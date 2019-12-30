import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Tree} from '../../model/tree';
import {TreeResolverService} from '../../services/tree-resolver.service';
import {forceCollide, forceLink, forceManyBody, forceSimulation} from 'd3-force';
import Hammer from 'hammerjs';

@Component({
  selector: 'app-svg-tree',
  templateUrl: './svg-tree.component.html',
  styleUrls: ['./svg-tree.component.css']
})
export class SvgTreeComponent implements OnInit, AfterViewInit {
  @Input() shakeEvent: EventEmitter<void>;
  @ViewChild('zoomControl', {static: false}) zoomControl: ElementRef;
  @Output() tapPerson = new EventEmitter<number>();
  nodes: TreeNodeD3[];
  links: RawLink[];
  width = 600.;
  height = 600.;
  lineHeight = 120;
  spaceWidth = 60;

  simulation: any;
  minLevel: number;
  maxLevel: number;
  x = 0;
  y = 0;
  zoom = 1;

  @Input()
  set tree(tree: Tree) {
    this.redraw(tree);
  }

  constructor(private treeResolver: TreeResolverService) {
  }

  ngOnInit() {
    if (this.shakeEvent) {
      this.shakeEvent.subscribe(data => this.shake());
    }
  }

  redraw(tree: Tree) {
    const treeNodes = this.treeResolver.buildNodes(tree);
    this.nodes = treeNodes.map((n) => {
      const treeNodeD3 = new TreeNodeD3();
      treeNodeD3.id = n.id;
      treeNodeD3.name = n.name;
      treeNodeD3.surname = n.surname;
      treeNodeD3.dates = n.dates;
      treeNodeD3.s = n.s;
      return treeNodeD3;
    });
    this.nodes.forEach((n) => {
      const treeNode = treeNodes.find((i) => i.id === n.id);
      if (treeNode.m !== undefined) {
        n.m = this.nodes.find((i) => i.id === treeNode.m);
      }
      if (treeNode.f !== undefined) {
        n.f = this.nodes.find((i) => i.id === treeNode.f);
      }
      if (treeNode.marr !== undefined && treeNode.marr.length > 0) {
        n.marr = [];
        treeNode.marr.forEach((mId) => n.marr.push(this.nodes.find((i) => i.id === mId)));
      }
    });
    this.calcAndNormalizeLevels();
    this.addSyntheticNodes();
    this.createLinks();
    this.setDefaultPositionForNodes();
    this.simulation = forceSimulation();
    this.simulation.force('link', forceLink().id((n: TreeNodeD3) => this.nodeIdentity(null, n)).distance(this.lineHeight).strength(.4));
    this.simulation.force('charge', forceManyBody());
    this.simulation.force('collide', forceCollide(this.spaceWidth).strength(.5));
    this.simulation
      .nodes(this.nodes)
      .on('tick', () => this.ticked());
    this.simulation
      .force('link')
      .links(this.links);
  }

  ngAfterViewInit() {
    const hammer = new Hammer.Manager(this.zoomControl.nativeElement);
    hammer.add(new Hammer.Pan({threshold: 0, pointers: 0}));
    hammer.add(new Hammer.Pinch({threshold: 0})).recognizeWith([hammer.get('pan')]);
    hammer.add(new Hammer.Tap());

    let prevDeltaX = 0;
    let prevDeltaY = 0;
    let selectedElement: TreeNodeD3 = null;
    hammer.on('panstart panmove panend', (ev) => {
      if (ev.type === 'panend') {
        if (selectedElement) {
          this.dragended(selectedElement);
          selectedElement = null;
        }
        return;
      }
      if (ev.type === 'panstart') {
        document.body.style.touchAction = 'none';
        if (ev.target.classList.contains('drag_node')) {
          const nodeId = parseInt(ev.target.id.substr(5), 10);
          selectedElement = this.nodes.find((n) => n.synthetic === false && n.id === nodeId);
          this.dragstarted(selectedElement);
        }
        prevDeltaX = 0;
        prevDeltaY = 0;
      }
      const dx = (ev.deltaX - prevDeltaX);
      const dy = (ev.deltaY - prevDeltaY);
      if (selectedElement) {
        this.dragged(selectedElement, dx, dy);
      } else {
        this.x += dx;
        this.y += dy;
      }
      prevDeltaX = ev.deltaX;
      prevDeltaY = ev.deltaY;
    });

    let initialScale;
    hammer.on('pinchstart pinchmove', (ev) => {
      if (ev.type === 'pinchstart') {
        document.body.style.touchAction = 'none';
        initialScale = this.zoom;
      }
      this.zoomed(initialScale * ev.scale);
    });

    hammer.on('tap', (ev) => {
      if (ev.target.classList.contains('drag_node')) {
        const nodeId = parseInt(ev.target.id.substr(5), 10);
        this.tapPerson.emit(nodeId);
      }
    });
    (this.zoomControl.nativeElement as HTMLElement).addEventListener('wheel', (ev) => {
      const delta = 1.3;
      const rotation = ev.deltaY > 0 ? (1 / delta) : delta;
      this.zoomed(this.zoom * rotation);
      ev.preventDefault();
    });
    hammer.on('hammer.input', (ev) => {
      if (ev.isFinal) {
        document.body.style.touchAction = 'inherit';
      }
    });
  }

  shake() {
    this.nodes.forEach((n) => {
      n.x += (Math.random() - .5) * 80;
      n.y += (Math.random() - .5) * 80;
    });
    this.simulation.alpha(1).restart();
  }

  nodeIdentity(i: number, n: TreeNodeD3) {
    if (n.synthetic === false) {
      return n.id;
    } else {
      return (n as TreeNodeD3Synthetic).sid;
    }
  }


  private createSyntheticId(id1: number, id2: number) {
    return `l${Math.min(id1, id2)}_${Math.max(id1, id2)}`;
  }

  private recalculateSyntheticNodePos() {
    this.nodes.filter((n) => n.synthetic === true)
      .map((n) => n as TreeNodeD3Synthetic)
      .forEach((n) => {
        const fromItem = n.from;
        const toItem = n.to;
        n.x = (fromItem.x + toItem.x) / 2;
        n.y = (fromItem.y + toItem.y) / 2;
      });
  }

  private tryFindLevel(p: TreeNodeD3, visited: number[]) {
    if (p && p.synthetic === false && visited.indexOf(p.id) === -1) {
      visited.push(p.id);
      if (p.level !== undefined) {
        return p.level;
      }
      if (p.m) {
        const level = this.tryFindLevel(p.m, visited);
        if (level !== undefined) {
          return level + 1;
        }
      }
      if (p.f) {
        const level = this.tryFindLevel(p.f, visited);
        if (level !== undefined) {
          return level + 1;
        }
      }
      if (p.marr) {
        for (const marr of p.marr) {
          const level = this.tryFindLevel(marr, visited);
          if (level !== undefined) {
            return level;
          }
        }
      }
    }
  }

  private setLevels(p: TreeNodeD3, visitedIds: number[], level: number | undefined) {
    if (p && p.synthetic === false && visitedIds.indexOf(p.id) === -1) {
      if (level === undefined) {
        const visited: number[] = [];
        level = this.tryFindLevel(p, visited);
        if (level === undefined) {
          level = 0;
        }
      }
      p.level = level;
      visitedIds.push(p.id);
      if (p.m) {
        this.setLevels(p.m, visitedIds, level - 1);
      }
      if (p.f) {
        this.setLevels(p.f, visitedIds, level - 1);
      }
      if (p.marr) {
        p.marr.forEach((mar) => this.setLevels(mar, visitedIds, level));
      }
    }
  }

  private calcAndNormalizeLevels() {
    const visitedIds: number[] = [];
    this.nodes.forEach((i) => this.setLevels(i, visitedIds, undefined));

    const minLevel = Math.min(...this.nodes.map((i) => i.level).filter((i) => i !== undefined));
    if (minLevel < 0) {
      this.nodes.forEach((i) => i.level += (0 - minLevel));
    }

    const levels: number[] = this.nodes.filter((i) => i.level !== undefined).map((i) => i.level);
    this.minLevel = Math.min(...levels);
    this.maxLevel = Math.max(...levels);
  }

  private addSyntheticNodes() {
    this.nodes.filter((n) => n.synthetic === false)
      .forEach((n) => {
        if (n.m && n.f) {
          const sid = this.createSyntheticId(n.m.id, n.f.id);
          const hasSameNode = this.nodes.some((d) => d.synthetic === true && this.nodeIdentity(null, d) === sid);
          if (!hasSameNode) {
            const newNode = new TreeNodeD3Synthetic(sid, n.m, n.f);
            this.nodes.push(newNode);
          }
        }
      });
  }

  private createLinks() {
    this.links = [];
    this.nodes.forEach((n) => {
      if (n.synthetic === true) {
        const s = n as TreeNodeD3Synthetic;
        this.links.push(new RawLink(s.from.id, s.sid));
        this.links.push(new RawLink(s.to.id, s.sid));
      } else {
        if (n.m || n.f) {
          if (!n.m) {
            this.links.push(new RawLink(n.f.id, n.id));
          } else if (!n.f) {
            this.links.push(new RawLink(n.m.id, n.id));
          } else {
            this.links.push(new RawLink(this.createSyntheticId(n.m.id, n.f.id), n.id));
          }
        }
        if (n.marr && n.marr.length > 0) {
          n.marr.forEach((mar) => {
            const syntheticId = this.createSyntheticId(n.id, mar.id);
            const hasSyntheticNodes = this.nodes
              .some((i) => i.synthetic === true && this.nodeIdentity(null, i) === syntheticId);
            if (!hasSyntheticNodes) {
              const hasLink = this.links.some((l) => l.source === mar.id && l.target === n.id || l.source === n.id && l.target === mar.id);
              if (!hasLink) {
                this.links.push(new RawLink(n.id, mar.id));
              }
            }
          });
        }
      }
    });
  }

  private setDefaultPositionForNodes() {
    const middleLevel = (this.maxLevel + this.minLevel) / 2;
    const centerY = this.height / 2;
    this.nodes.filter((d) => d.synthetic === false)
      .forEach((d) => {
        d.idealY = centerY + (d.level - middleLevel) * this.lineHeight;
        d.y = d.idealY;
      });

    // TODO: refactor
    const levelPos: { [level: number]: number } = {};
    this.nodes.filter((n) => n.synthetic === false)
      .forEach((n) => {
        if (levelPos[n.level] === undefined) {
          levelPos[n.level] = 0;
        }
        const x = (this.width / 2) + (levelPos[n.level] % 2 ? -1 : 1) * (levelPos[n.level] / 2 * this.spaceWidth);
        ++levelPos[n.level];
        n.x = x;
      });
    this.recalculateSyntheticNodePos();
  }

  private ticked() {
    // const alpha = this.simulation.alpha();
    // console.log(alpha);

    this.nodes.filter((d) => d.synthetic === false)
      .forEach((d) => {
        if (d.y > d.idealY && d.vy > 0 ||
          d.y < d.idealY && d.vy < 0) {
          d.vy += 3 * (d.vy > 0 ? -1 : 1);
        }
        if (Math.abs(d.y - d.idealY) > this.lineHeight / 2.5) {
          d.y = d.idealY + this.lineHeight / 2.5 * ((d.y > d.idealY) ? 1 : -1);
        }
        const mItem = d.m;
        const fItem = d.f;
        const items = [mItem, fItem].filter((i) => i);
        let idealX;
        if (items.length > 0) {
          idealX = items.reduce((acc, v) => acc + v.x, 0) / items.length;
        }
        if (idealX !== undefined) {
          if (d.x > idealX && d.vx > 0 ||
            d.x < idealX && d.vx < 0) {
            d.vx += 1 * (d.vx > 0 ? -1 : 1);
          }
        } else {
          idealX = this.width / 2;
          const speed = Math.abs(idealX - d.x);
          if (speed > 300 &&
            (d.x > idealX && d.vx > 0 ||
              d.x < idealX && d.vx < 0)) {
            d.vx += speed / 100. * (d.vx > 0 ? -1 : 1);
          }
        }
      });

    this.recalculateSyntheticNodePos();
  }

  dragstarted(n: TreeNodeD3) {
    this.simulation.alphaTarget(0.7).restart();
    n.fx = n.x;
    n.fy = n.y;
  }

  dragged(n: TreeNodeD3, dx: number, dy: number) {
    n.fx += dx / this.zoom;
    n.fy += dy / this.zoom;
  }

  dragended(n: TreeNodeD3) {
    this.simulation.alphaTarget(0);
    n.fx = null;
    n.fy = null;
  }

  zoomed(scale: number) {
    const delta = scale / this.zoom;
    this.zoom = scale;
    this.x *= delta;
    this.x -= (this.width / 2) * (delta - 1);
    this.y *= delta;
    this.y -= (this.height / 2) * (delta - 1);
  }
}

class NodeD3Force {
  x: number;
  y: number;
  fx: number;
  fy: number;
  vx: number;
  vy: number;
}

class TreeNodeD3 extends NodeD3Force {
  id: number;
  name: string;
  surname: string;
  dates: string;
  s: string;
  m: TreeNodeD3;
  f: TreeNodeD3;
  marr: TreeNodeD3[];
  level: number;
  idealY: number;
  synthetic: boolean;

  constructor() {
    super();
    this.synthetic = false;
  }
}

class TreeNodeD3Synthetic extends TreeNodeD3 {
  sid: string;
  from: TreeNodeD3;
  to: TreeNodeD3;

  constructor(sid: string, from: TreeNodeD3, to: TreeNodeD3) {
    super();
    this.synthetic = true;
    this.sid = sid;
    this.from = from;
    this.to = to;
  }
}

class RawLink {
  source: number | string;
  target: number | string;

  constructor(source: number | string, target: number | string) {
    this.source = source;
    this.target = target;
  }
}
