import {deletePackageVersion, deletePackageVersions} from '../../src/version'
import {Input} from '../../src/input'

const githubToken = process.env.GITHUB_TOKEN as string

describe.skip('delete tests', () => {
  it('deletePackageVersion', async () => {
    const response = await deletePackageVersion(
      'PV_lADOGReZt84AEI7FzgDSHEI',
      new Input({token: githubToken})
    ).toPromise()
    expect(response).toBe(true)
  })

  it('deletePackageVersions', async () => {
    const response = await deletePackageVersions(
      [
        'PV_lADOGReZt84AEI7FzgDSHDs',
        'PV_lADOGReZt84AEI7FzgDSHDY',
        'PV_lADOGReZt84AEI7FzgDSHC8'
      ],
      new Input({token: githubToken})
    ).toPromise()
    expect(response).toBe(true)
  })
})
