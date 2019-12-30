import { TestBed } from '@angular/core/testing';

import { TreeResolverService } from './tree-resolver.service';

describe('TreeResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: TreeResolverService = TestBed.get(TreeResolverService);
    expect(service).toBeTruthy();
  });
});
