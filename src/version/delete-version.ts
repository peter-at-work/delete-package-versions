import {Input} from '../input'
import {Octokit} from '@octokit/rest'
import {from, Observable, merge, throwError, of} from 'rxjs'
import {catchError, map, tap} from 'rxjs/operators'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {graphql} from './graphql'

let deleted = 0

export interface DeletePackageVersionMutationResponse {
  deletePackageVersion: {
    success: boolean
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const mutation = `
  mutation deletePackageVersion($packageVersionId: ID!) {
      deletePackageVersion(input: {packageVersionId: $packageVersionId}) {
          success
      }
  }`

export function deletePackageVersion(
  packageVersionId: string,
  input: Input
): Observable<boolean> {
  deleted += 1

  console.log('Deleting version:', packageVersionId)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const octokit = new Octokit({auth: input.token})
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const packageType = 'npm'

  return from(
    /*
    graphql(token, mutation, {
      packageVersionId,
      headers: {
        Accept: 'application/vnd.github.package-deletes-preview+json'
      }
    }) as Promise<DeletePackageVersionMutationResponse>
    */
    /*
    // TODO: Access token should have the `packages:delete` scope.
    octokit.rest.packages.deletePackageVersionForOrg({
      org: input.owner,
      package_type: packageType,
      package_name: input.packageName,
      package_version_id: Number.parseInt(packageVersionId)
    })
    */
    Promise.resolve({
      deletePackageVersion: {
        success: true
      }
    })
  ).pipe(
    catchError(err => {
      const msg = 'delete version mutation failed.'
      return throwError(
        err.errors && err.errors.length > 0
          ? `${msg} ${err.errors[0].message}`
          : `${msg} ${err.message} \n${deleted - 1} versions deleted till now.`
      )
    }),
    map(response => response.deletePackageVersion.success)
  )
}

export function deletePackageVersions(
  packageVersionIds: string[],
  input: Input
): Observable<boolean> {
  if (packageVersionIds.length === 0) {
    return of(true)
  }

  const deletes = packageVersionIds.map(id =>
    deletePackageVersion(id, input).pipe(
      tap(result => {
        if (!result) {
          console.log(`version with id: ${id}, not deleted`)
        }
      })
    )
  )
  console.log(`Total versions deleted till now: ${deleted}`)
  return merge(...deletes)
}
