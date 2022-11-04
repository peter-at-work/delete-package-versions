import {mockOldestQueryResponse} from './graphql.mock'
import {
  getOldestVersions as _getOldestVersions,
  QueryInfo
} from '../../src/version'
import {Observable} from 'rxjs'

describe.skip('get versions tests -- call graphql', () => {
  it('getOldestVersions -- succeeds', done => {
    const numVersions = 1
    getOldestVersions({numVersions}).subscribe(result => {
      expect(result.versions.length).toBe(numVersions)
      done()
    })
  })

  it('getOldestVersions -- fails for invalid repo', done => {
    getOldestVersions({repo: 'actions-testin'}).subscribe({
      error: err => {
        expect(err).toBeTruthy()
        done()
      },
      complete: async () => done.fail('no error thrown')
    })
  })
})

describe.skip('get versions tests -- mock graphql', () => {
  it('getOldestVersions -- success', done => {
    const numVersions = 5
    mockOldestQueryResponse(numVersions)

    getOldestVersions({numVersions}).subscribe(result => {
      expect(result.versions.length).toBe(numVersions)
      done()
    })
  })
})

interface Params {
  owner?: string
  repo?: string
  packageName?: string
  numVersions?: number
  startCursor?: string
  token?: string
}

const defaultParams = {
  owner: 'namratajha',
  repo: 'test-repo',
  packageName: 'test-repo',
  numVersions: 1,
  startCursor: '',
  token: process.env.GITHUB_TOKEN as string
}

function getOldestVersions(params?: Params): Observable<QueryInfo> {
  const p: Required<Params> = {...defaultParams, ...params}
  return _getOldestVersions(
    p.owner,
    p.repo,
    p.packageName,
    p.numVersions,
    p.startCursor,
    p.token
  )
}
