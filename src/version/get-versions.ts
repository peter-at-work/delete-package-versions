import {Octokit} from '@octokit/rest'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {OctokitResponse} from '@octokit/types/dist-types'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {RestEndpointMethodTypes} from '@octokit/plugin-rest-endpoint-methods/dist-types'
import {GraphQlQueryResponse} from '@octokit/graphql/dist-types/types'
import {Observable, from, throwError} from 'rxjs'
import {catchError, map} from 'rxjs/operators'
import {graphql} from './graphql'

export interface VersionInfo {
  id: string
  version: string
}

export interface QueryInfo {
  versions: VersionInfo[]
  cursor: string
  paginate: boolean
  totalCount: number
}

export interface GetVersionsQueryResponse {
  repository: {
    packages: {
      edges: {
        node: {
          name: string
          versions: {
            totalCount: number
            edges: {node: VersionInfo}[]
            pageInfo: {
              startCursor: string
              hasPreviousPage: boolean
            }
          }
        }
      }[]
    }
  }
}

const query = `
  query getVersions($owner: String!, $repo: String!, $package: String!, $last: Int!) {
    repository(owner: $owner, name: $repo) {
      packages(first: 1, names: [$package]) {
        edges {
          node {
            name
            versions(last: $last) {
              totalCount
              edges {
                node {
                  id
                  version
                }
              }
              pageInfo {
                startCursor
                hasPreviousPage
              }
            }
          }
        }
      }
    }
  }`

const Paginatequery = `
  query getVersions($owner: String!, $repo: String!, $package: String!, $last: Int!, $before: String!) {
    repository(owner: $owner, name: $repo) {
      packages(first: 1, names: [$package]) {
        edges {
          node {
            name
            versions(last: $last, before: $before) {
              totalCount
              edges {
                node {
                  id
                  version
                }
              }
              pageInfo{
                startCursor
                hasPreviousPage
              }
            }
          }
        }
      }
    }
  }`

export function queryForOldestVersions(
  owner: string,
  repo: string,
  packageName: string,
  numVersions: number,
  startCursor: string,
  token: string
): Observable<GetVersionsQueryResponse> {
  if (startCursor === '') {
    return from(
      graphql(token, query, {
        owner,
        repo,
        package: packageName,
        last: numVersions,
        headers: {
          Accept: 'application/vnd.github.packages-preview+json'
        }
      }) as Promise<GetVersionsQueryResponse>
    ).pipe(
      catchError((err: GraphQlQueryResponse<unknown>) => {
        const msg = 'query for oldest version failed.'
        return throwError(
          err.errors && err.errors.length > 0
            ? `${msg} ${err.errors[0].message}`
            : `${msg} verify input parameters are correct`
        )
      })
    )
  } else {
    return from(
      graphql(token, Paginatequery, {
        owner,
        repo,
        package: packageName,
        last: numVersions,
        before: startCursor,
        headers: {
          Accept: 'application/vnd.github.packages-preview+json'
        }
      }) as Promise<GetVersionsQueryResponse>
    ).pipe(
      catchError((err: GraphQlQueryResponse<unknown>) => {
        const msg = 'query for oldest version failed.'
        return throwError(
          err.errors && err.errors.length > 0
            ? `${msg} ${err.errors[0].message}`
            : `${msg} verify input parameters are correct`
        )
      })
    )
  }
}

export function getOldestVersions(
  owner: string,
  repo: string,
  packageName: string,
  numVersions: number,
  startCursor: string,
  token: string
): Observable<QueryInfo> {
  const octokit = new Octokit({auth: token})

  // TODO: Packages REST API requires package_type query parameter, and cannot be inferred.
  const packageType = 'npm'

  // NPM packages are owned by the organization, optionally connected to a repository;
  // The access token will have to be organization-scoped; the standard GITHUB_TOKEN will not have access to the NPM packages.
  // The repo query parameter is not used in the Packages REST API.
  // TODO: This only applies to package types container and npm.
  //const iterator = octokit.paginate.iterator(
  //  octokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg,
  //  {
  //    org: owner,
  //    per_page: 100,
  //    package_type: packageType,
  //    package_name: packageName
  //  }
  //)
  const paginator = octokit.paginate(
    octokit.rest.packages.getAllPackageVersionsForPackageOwnedByOrg,
    {
      org: owner,
      per_page: 100,
      package_type: packageType,
      package_name: packageName
    }
  ) as Promise<{id: number; name: string}[]>

  return from(paginator).pipe(
    map(versions => {
      const r: QueryInfo = {
        versions: versions
          .map(value => ({id: value.id.toString(), version: value.name}))
          .reverse(),
        cursor: '',
        paginate: false,
        totalCount: versions.length
      }
      return r
    })
  )

  return queryForOldestVersions(
    owner,
    repo,
    packageName,
    numVersions,
    startCursor,
    token
  ).pipe(
    map(result => {
      let r: QueryInfo
      if (result.repository.packages.edges.length < 1) {
        console.log(
          `package: ${packageName} not found for owner: ${owner} in repo: ${repo}`
        )
        r = {
          versions: [] as VersionInfo[],
          cursor: '',
          paginate: false,
          totalCount: 0
        }
        return r
      }

      const versions = result.repository.packages.edges[0].node.versions.edges
      const pages = result.repository.packages.edges[0].node.versions.pageInfo
      const count = result.repository.packages.edges[0].node.versions.totalCount

      r = {
        versions: versions
          .map(value => ({id: value.node.id, version: value.node.version}))
          .reverse(),
        cursor: pages.startCursor,
        paginate: pages.hasPreviousPage,
        totalCount: count
      }

      return r
    })
  )
}
